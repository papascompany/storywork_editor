# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "onnxruntime>=1.17",
#   "opencv-python-headless>=4.9",
#   "numpy>=1.26",
# ]
# ///
"""
enrich-keypoints.py — DWPose 기반 포즈 키포인트 일괄 보강 (CHAR-GEN-01)

data/poses/raw/**/*.png (투명배경 단일 인물 자산)에 대해:
  1. 알파채널 bbox 를 person bbox 로 사용 (검출기 불필요 — yolox 생략)
  2. DWPose(dw-ll_ucoco_384.onnx, Apache-2.0) SimCC 추론 → COCO-WholeBody 133점
  3. 133점 → StoryWork 25점 KP 스키마 매핑 (shared-schema KPNameSchema)
  4. 신뢰도(weight) 기록, 임계 미달 포인트는 제외.
     head/mouth/center 는 미달 시 알파 bbox 휴리스틱 폴백(inferred=true)
  5. <id>.kp.json 사이드카 생성 (--write 시) + 보고서/검수 큐 목록

사용:
  uv run scripts/enrich-keypoints.py --limit 24 --overlay   # 파일럿 (사이드카 미기록)
  uv run scripts/enrich-keypoints.py --all --write          # 전량 + 사이드카 기록

모델: data/models/dw-ll_ucoco_384.onnx
  (https://huggingface.co/yzd-v/DWPose — Apache-2.0, ~128MB, gitignored)

결정론: 고정 모델 + 고정 전처리 → 같은 입력 = 같은 출력. 정렬된 경로 순회.
주의: DWPose 는 실사 인체 학습 모델 — 만화풍 일반화 한계(연구 §3.3)를
      파일럿 오버레이 검수로 게이트한다. '중복' 폴더는 LICENSE.json 규칙대로 제외.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "poses" / "raw"
MODEL_PATH = ROOT / "data" / "models" / "dw-ll_ucoco_384.onnx"
OVERLAY_DIR = ROOT / "data" / "poses" / "kp-overlays"
REPORT_PATH = ROOT / "data" / "poses" / "kp-enrich-report.json"

INPUT_W, INPUT_H = 288, 384
SIMCC_SPLIT = 2.0
PAD_RATIO = 1.25
# 신뢰도 = SimCC raw max 평균 (mmpose 관례). 실사 대비 만화풍은 절대값이 낮게
# 나오므로(파일럿 실측: 정상 포인트 0.15~0.25) 임계값은 본 자산군 분포로 보정.
MIN_WEIGHT = 0.08  # 이 미만 포인트는 사이드카에서 제외
LOW_CONF_MEAN = 0.12  # 평균 신뢰도 미달 → 검수 큐
# 제외 폴더:
#  - 중복: LICENSE.json ingest.subfolderRules include:false
#  - 동물: 사족보행 — 인체 포즈 모델 도메인 밖 (오버레이 실사로 확인. 3점 휴리스틱 유지)
#  - 사랑: 2인 커플 구도 — 단일 인물 키포인트 스키마 밖 (전면 인물만 추적됨)
EXCLUDED_DIRS = {"중복", "동물", "사랑"}

MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)

# ── COCO-WholeBody 인덱스 ────────────────────────────────────────────────
NOSE, L_EYE, R_EYE = 0, 1, 2
L_SH, R_SH, L_EL, R_EL, L_WR, R_WR = 5, 6, 7, 8, 9, 10
L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANK, R_ANK = 11, 12, 13, 14, 15, 16
L_FOOT_IDX = [17, 18, 19]
R_FOOT_IDX = [20, 21, 22]
MOUTH_OUTER = list(range(23 + 48, 23 + 60))  # face 68점 중 입 외곽 48..59
L_HAND_IDX = list(range(91, 112))
R_HAND_IDX = list(range(112, 133))


def alpha_bbox(img: np.ndarray) -> tuple[int, int, int, int] | None:
    """RGBA 알파 채널에서 (x0, y0, x1, y1) bbox. 알파 없으면 None."""
    if img.ndim != 3 or img.shape[2] != 4:
        return None
    ys, xs = np.where(img[:, :, 3] > 10)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def composite_white(img: np.ndarray) -> np.ndarray:
    """RGBA(BGR 순서 채널) → 흰 배경 합성 RGB(float32)."""
    if img.ndim == 3 and img.shape[2] == 4:
        bgr = img[:, :, :3].astype(np.float32)
        a = img[:, :, 3:4].astype(np.float32) / 255.0
        bgr = bgr * a + 255.0 * (1.0 - a)
    else:
        bgr = img[:, :, :3].astype(np.float32)
    return cv2.cvtColor(bgr.astype(np.uint8), cv2.COLOR_BGR2RGB).astype(np.float32)


def bbox_to_center_scale(bbox: tuple[int, int, int, int]) -> tuple[np.ndarray, np.ndarray]:
    x0, y0, x1, y1 = bbox
    center = np.array([(x0 + x1) / 2.0, (y0 + y1) / 2.0], dtype=np.float32)
    w, h = (x1 - x0) * PAD_RATIO, (y1 - y0) * PAD_RATIO
    # 입력 종횡비(288/384=0.75)에 맞춰 확장
    ratio = INPUT_W / INPUT_H
    if w / h > ratio:
        h = w / ratio
    else:
        w = h * ratio
    return center, np.array([w, h], dtype=np.float32)


def crop_affine(rgb: np.ndarray, center: np.ndarray, scale: np.ndarray) -> np.ndarray:
    """center/scale 박스를 (INPUT_W, INPUT_H) 로 워프."""
    src = np.array(
        [
            center - scale / 2.0,
            [center[0] + scale[0] / 2.0, center[1] - scale[1] / 2.0],
            center + scale / 2.0,
        ],
        dtype=np.float32,
    )
    dst = np.array([[0, 0], [INPUT_W, 0], [INPUT_W, INPUT_H]], dtype=np.float32)
    mat = cv2.getAffineTransform(src, dst)
    return cv2.warpAffine(rgb, mat, (INPUT_W, INPUT_H), flags=cv2.INTER_LINEAR)


def simcc_decode(simcc_x: np.ndarray, simcc_y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(1,133,W*2)/(1,133,H*2) → 좌표(133,2, 입력공간)·신뢰도(133,).

    신뢰도는 SimCC raw max 의 축 평균 (mmpose get_simcc_maximum 관례).
    가우시안 라벨 스무딩 때문에 softmax 피크 확률은 bin 수에 뭉개져 부적합.
    """
    sx, sy = simcc_x[0], simcc_y[0]
    ix = sx.argmax(axis=1)
    iy = sy.argmax(axis=1)
    conf = ((sx.max(axis=1) + sy.max(axis=1)) / 2.0).astype(np.float32)
    coords = np.stack([ix / SIMCC_SPLIT, iy / SIMCC_SPLIT], axis=1).astype(np.float32)
    return coords, conf


def run_dwpose(
    sess: ort.InferenceSession, rgb: np.ndarray, bbox: tuple[int, int, int, int]
) -> tuple[np.ndarray, np.ndarray]:
    """이미지 → (133,2) 원본 픽셀 좌표 + (133,) 신뢰도."""
    center, scale = bbox_to_center_scale(bbox)
    crop = crop_affine(rgb, center, scale)
    inp = ((crop - MEAN) / STD).transpose(2, 0, 1)[np.newaxis].astype(np.float32)
    input_name = sess.get_inputs()[0].name
    simcc_x, simcc_y = sess.run(None, {input_name: inp})
    coords, conf = simcc_decode(simcc_x, simcc_y)
    # 입력공간 → 원본공간
    coords[:, 0] = coords[:, 0] / INPUT_W * scale[0] + center[0] - scale[0] / 2.0
    coords[:, 1] = coords[:, 1] / INPUT_H * scale[1] + center[1] - scale[1] / 2.0
    return coords, conf


def _pt(coords: np.ndarray, conf: np.ndarray, idx: int) -> tuple[float, float, float]:
    return float(coords[idx, 0]), float(coords[idx, 1]), float(conf[idx])


def _mean_pt(coords: np.ndarray, conf: np.ndarray, idxs: list[int]) -> tuple[float, float, float]:
    return (
        float(coords[idxs, 0].mean()),
        float(coords[idxs, 1].mean()),
        float(conf[idxs].mean()),
    )


def map_to_25(coords: np.ndarray, conf: np.ndarray) -> list[dict]:
    """COCO-WholeBody 133 → StoryWork 25점 (픽셀 좌표 + weight)."""
    out: list[dict] = []

    def add(name: str, x: float, y: float, w: float) -> None:
        out.append({"name": name, "x": x, "y": y, "weight": round(min(max(w, 0.0), 1.0), 4)})

    nose = _pt(coords, conf, NOSE)
    leye, reye = _pt(coords, conf, L_EYE), _pt(coords, conf, R_EYE)
    head = (
        ((leye[0] + reye[0]) / 2, (leye[1] + reye[1]) / 2, (leye[2] + reye[2]) / 2)
        if min(leye[2], reye[2]) >= MIN_WEIGHT
        else nose
    )
    add("head", *head)
    add("left_eye", *leye)
    add("right_eye", *reye)
    add("mouth", *_mean_pt(coords, conf, MOUTH_OUTER))

    lsh, rsh = _pt(coords, conf, L_SH), _pt(coords, conf, R_SH)
    lhip, rhip = _pt(coords, conf, L_HIP), _pt(coords, conf, R_HIP)
    neck = ((lsh[0] + rsh[0]) / 2, (lsh[1] + rsh[1]) / 2, (lsh[2] + rsh[2]) / 2)
    hip = ((lhip[0] + rhip[0]) / 2, (lhip[1] + rhip[1]) / 2, (lhip[2] + rhip[2]) / 2)
    add("neck", *neck)
    add("left_shoulder", *lsh)
    add("right_shoulder", *rsh)
    add("left_elbow", *_pt(coords, conf, L_EL))
    add("right_elbow", *_pt(coords, conf, R_EL))
    add("left_wrist", *_pt(coords, conf, L_WR))
    add("right_wrist", *_pt(coords, conf, R_WR))
    add("left_hand", *_mean_pt(coords, conf, L_HAND_IDX))
    add("right_hand", *_mean_pt(coords, conf, R_HAND_IDX))

    # 파생 몸통 포인트는 기하적으로 안정적인 중점 — 가중치는 평균 사용
    # (min 은 최약 관절에 끌려 불필요한 휴리스틱 폴백을 유발)
    chest = (
        neck[0] * 0.7 + hip[0] * 0.3,
        neck[1] * 0.7 + hip[1] * 0.3,
        (neck[2] + hip[2]) / 2,
    )
    torso = ((neck[0] + hip[0]) / 2, (neck[1] + hip[1]) / 2, (neck[2] + hip[2]) / 2)
    center = (
        (lsh[0] + rsh[0] + lhip[0] + rhip[0]) / 4,
        (lsh[1] + rsh[1] + lhip[1] + rhip[1]) / 4,
        (lsh[2] + rsh[2] + lhip[2] + rhip[2]) / 4,
    )
    add("chest", *chest)
    add("torso", *torso)
    add("center", *center)
    add("hip", *hip)
    add("left_hip", *lhip)
    add("right_hip", *rhip)
    add("left_knee", *_pt(coords, conf, L_KNEE))
    add("right_knee", *_pt(coords, conf, R_KNEE))
    add("left_ankle", *_pt(coords, conf, L_ANK))
    add("right_ankle", *_pt(coords, conf, R_ANK))
    add("left_foot", *_mean_pt(coords, conf, L_FOOT_IDX))
    add("right_foot", *_mean_pt(coords, conf, R_FOOT_IDX))
    return out


def heuristic_fallback(name: str, bbox: tuple[int, int, int, int]) -> dict:
    """알파 bbox 휴리스틱 — 기존 3점 자동 추정과 동일 철학 (inferred=true)."""
    x0, y0, x1, y1 = bbox
    cx, h = (x0 + x1) / 2, y1 - y0
    pos = {
        "head": (cx, y0 + h * 0.12),
        "mouth": (cx, y0 + h * 0.20),
        "center": (cx, (y0 + y1) / 2),
    }[name]
    return {"name": name, "x": pos[0], "y": pos[1], "weight": 0.3, "inferred": True}


def load_license() -> dict:
    data = json.loads((RAW_DIR / "LICENSE.json").read_text(encoding="utf-8"))
    lic = data["license"]
    return {"id": lic["id"], "holder": lic["holder"], "terms": lic["terms"]}


def draw_overlay(rgb: np.ndarray, kps: list[dict], w: int, h: int, out_path: Path) -> None:
    canvas = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)
    for kp in kps:
        x, y = int(kp["x"] * w), int(kp["y"] * h)
        weight = kp.get("weight", 0)
        color = (0, 200, 0) if weight >= 0.6 else (0, 165, 255) if weight >= MIN_WEIGHT else (0, 0, 255)
        cv2.circle(canvas, (x, y), 6, color, -1)
        cv2.putText(
            canvas, kp["name"], (x + 8, y + 3), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (60, 60, 60), 1
        )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), canvas)


def collect_targets(limit: int | None) -> list[Path]:
    import unicodedata

    files: list[Path] = []
    for p in sorted(RAW_DIR.rglob("*.png")):
        # macOS 파일명은 NFD — 비교 전 NFC 정규화 (미정규화 시 '중복' 제외 실패)
        parts = [unicodedata.normalize("NFC", part) for part in p.relative_to(RAW_DIR).parts[:-1]]
        if any(part in EXCLUDED_DIRS for part in parts):
            continue
        files.append(p)
    return files[:limit] if limit else files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--write", action="store_true", help="사이드카 .kp.json 기록")
    ap.add_argument("--overlay", action="store_true", help="검수용 오버레이 PNG 저장")
    args = ap.parse_args()

    if not MODEL_PATH.exists():
        print(f"[enrich-kp] 모델 없음: {MODEL_PATH}", file=sys.stderr)
        return 2
    if not args.all and args.limit is None:
        args.limit = 24  # 파일럿 기본

    license_ref = load_license()
    sess = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    targets = collect_targets(None if args.all else args.limit)
    print(f"[enrich-kp] 대상 {len(targets)}장 (write={args.write}, overlay={args.overlay})")

    results = []
    for i, path in enumerate(targets):
        rel = str(path.relative_to(RAW_DIR))
        img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if img is None:
            results.append({"file": rel, "status": "read-error"})
            continue
        h, w = img.shape[:2]
        bbox = alpha_bbox(img) or (0, 0, w, h)
        rgb = composite_white(img)

        coords, conf = run_dwpose(sess, rgb, bbox)
        kps_px = map_to_25(coords, conf)

        # 정규화 + 임계 필터.
        # 알파 bbox(+10% 패딩) 밖 포인트는 해부학적으로 불가 → 제거
        # (앉기 등 비정형 포즈에서 사지가 인물 밖으로 튀는 오검출 가드)
        bx0, by0, bx1, by1 = bbox
        pad_x, pad_y = (bx1 - bx0) * 0.10, (by1 - by0) * 0.10
        kept = []
        for kp in kps_px:
            weight = kp["weight"]
            if weight < MIN_WEIGHT:
                continue
            if not (bx0 - pad_x <= kp["x"] <= bx1 + pad_x and by0 - pad_y <= kp["y"] <= by1 + pad_y):
                continue
            x, y = kp["x"] / w, kp["y"] / h
            if not (0 <= x <= 1 and 0 <= y <= 1):
                continue
            kept.append({**kp, "x": round(x, 5), "y": round(y, 5)})

        # head/mouth/center 필수 폴백
        fallback_used = []
        for req in ("head", "mouth", "center"):
            if not any(k["name"] == req for k in kept):
                fb = heuristic_fallback(req, bbox)
                fb["x"], fb["y"] = round(fb["x"] / w, 5), round(fb["y"] / h, 5)
                kept.append(fb)
                fallback_used.append(req)

        weights = [k["weight"] for k in kept if not k.get("inferred")]
        mean_w = round(float(np.mean(weights)), 4) if weights else 0.0
        entry = {
            "file": rel,
            "status": "ok",
            "nKeypoints": len(kept),
            "meanWeight": mean_w,
            "fallback": fallback_used,
            "lowConfidence": mean_w < LOW_CONF_MEAN,
        }
        results.append(entry)

        if args.overlay:
            draw_overlay(rgb, kept, w, h, OVERLAY_DIR / rel)

        if args.write:
            nx0, ny0 = bbox[0] / w, bbox[1] / h
            sidecar = {
                "v": 1,
                "format": "png",
                "size": {"w": w, "h": h},
                "keypoints": kept,
                "bbox": {
                    "x": round(nx0, 5),
                    "y": round(ny0, 5),
                    "w": round(bbox[2] / w - nx0, 5),
                    "h": round(bbox[3] / h - ny0, 5),
                },
                "flippable": True,
                "license": license_ref,
                "_generator": {"tool": "dwpose-enrich", "model": "dw-ll_ucoco_384.onnx", "v": 1},
            }
            path.with_suffix("").with_suffix(".kp.json").write_text(
                json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )

        if (i + 1) % 100 == 0:
            print(f"[enrich-kp] {i + 1}/{len(targets)}")

    ok = [r for r in results if r["status"] == "ok"]
    low = [r["file"] for r in ok if r["lowConfidence"]]
    report = {
        "generatedBy": "scripts/enrich-keypoints.py",
        "model": "dw-ll_ucoco_384.onnx (Apache-2.0)",
        "total": len(results),
        "ok": len(ok),
        "meanWeightAvg": round(float(np.mean([r["meanWeight"] for r in ok])), 4) if ok else 0,
        "avgKeypoints": round(float(np.mean([r["nKeypoints"] for r in ok])), 1) if ok else 0,
        "lowConfidenceCount": len(low),
        "lowConfidenceFiles": low,  # 검수 큐 대상
        "results": results,
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"[enrich-kp] 완료: ok={len(ok)}/{len(results)}, meanW={report['meanWeightAvg']}, "
        f"avgKp={report['avgKeypoints']}, 검수큐={len(low)} → {REPORT_PATH}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
