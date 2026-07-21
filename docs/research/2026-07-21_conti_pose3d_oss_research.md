# 리서치: 콘티 자동생성 모듈 + 포즈 3D화 양산 + OSS/모델 조사

> **작성**: 2026-07-21 · **상태**: 제안 단계(구현 미착수, 휴먼게이트 승인 대기)
> **방법**: 병렬 서브에이전트 워크플로 2회(레포 분석 3 + 웹 리서치 8 + 완결성 비평 2, 총 13 에이전트).
> 가격·라이선스는 공식 페이지/LICENSE 원문 확인 원칙(미확인 항목은 각 절에 명시).
> **시각화**: [2026-07-21_conti_pose3d_oss_research.html](2026-07-21_conti_pose3d_oss_research.html)
> **관련**: [CLAUDE.md](../../CLAUDE.md) §5.1 · [ADR-0007/0011](../architecture/decisions.md) · [roadmap SW-BIZ](../architecture/roadmap.md)

---

## 0. 3줄 결론

1. **"대본→화자·장면·배경 분석→자동배치"는 M4에 이미 구현 완료.** 콘티 모듈은 신규 개발이 아니라
   기존 파이프라인의 중간 산출물을 컷 단위 콘티로 노출하는 확장이다. 단, 기본 운영 경로에서
   SceneMeta가 사실상 비어 있는 구멍(LLM off 고정)을 메우는 것이 품질의 핵심.
2. **3D화는 1,058장 전부가 아니라 체형 베이스 4~10종만.** 베이스 리깅 후 포즈×앵글×해상도를
   재렌더로 무한 양산 → lowDpi 96%·키포인트 3점 추정·뷰/액션 커버리지 편차가 동시 해결.
3. **자산 조립형 "글→콘티" 오픈소스는 세상에 없다** (전부 픽셀 생성형). 통째로 가져올 물건은 없고
   계층별 부품·패턴만 이식한다. 최대 기술 공백은 **한국어 화자귀속/coref** — 자체 구축 시 해자(moat).

---

## 1. 현황 진단 (레포 실측, 2026-07-21)

### 1.1 이미 있는 것
- `ai-script`: 5형식 자동감지, 장면분할 F1 0.899, **대사 단위 화자 귀속**(screenplay 견고 / novel은 발화동사 11종 정규식)
- `ai-recommend`: 포즈 K=5 후보 + confidence + alternatives, pgvector 검색(룰 60%+벡터 40%)
- `ai-layout`: 템플릿 5종·슬롯 배치·lowDpi 제약·결정론 시드(ADR-0007), `buildPageFabricJson` 서버측 합성 선례
- `/api/script/full-pipeline`: analyze→recommend→compose→원자 저장→편집기 진입. alternatives 한 클릭 교체 UI
- `pdf-engine`: 벡터(pdf-lib), 16p 실측 8~17ms, **'comicmaker' 만화/콘티 프리플라이트 프로필 기존재**, Pretendard 한글 임베드

### 1.2 없는 것 (제안이 전제하면 안 되는 것)

| 갭 | 실체 |
|---|---|
| SceneMeta 실가동 | location/cameraAngle/timeOfDay 등은 LLM enhance 전용인데 운영 경로가 `llmEnabled=false` 고정 → 항상 비어 있음. `view`는 코드 전체에서 한 번도 세팅 안 됨 |
| SceneMeta 영속화 | full-pipeline이 DB에 emotion·view만 저장. 나머지 메타·alternatives는 버려짐 |
| 페이지 분할 지능 | R2(closeup)/R3(wide)/R4(location)가 메타 부재로 미발화, R5는 no-op — 실질 R1(1장면=1페이지)만 작동 |
| editor-pose | `export {}` 빈 스텁. 키포인트 실소비자는 말풍선 꼬리 추적 + admin KeypointEditor뿐 |
| 키포인트 | 사이드카 0개 → 전량 알파채널 휴리스틱 3점(mouth는 고정 오프셋). 25점 스키마 중 22점 공백 |
| 캐릭터/커버리지 | DB 1,270건 전부 단일 '더미맨'. 상위 5액션 444건 vs 스포츠류 26종 1~4장 롱테일. three-quarter 뷰 47장뿐 |
| 해상도 | 96%가 750×750(74dpi) → lowDpi 1,238/1,270건. 풀샷 단독 페이지용 자산 사실상 21개 |
| KP 규약 불일치 | shared-schema 25종 언더스코어 vs admin 10종 하이픈 — 정밀 KP 도입 전 통일 필요 |

### 1.3 SSOT 갱신 필요(발견)
- 자산 수치 3개 충돌: 문서 1,058(루트) vs 파일 1,260(서브폴더 포함) vs DB 1,270 — 기준 수치 단일화 필요
- CLAUDE.md "nano-banana 2 = Gemini 2.5 Flash Image"는 구세대 표기(2026-07 현행: Gemini 3.1 Flash / 3 Pro Image)
- lowDpi 해소 렌더 목표: **min side ≥ 2,048px**(B5 200dpi 기준 2,024px+) — "1500px면 충분" 아님(≈148dpi)

---

## 2. 제안 A — 콘티 자동생성 모듈

### 2.1 시장 공백 (경쟁 조사 요약)
"대본 자동 분해 × 클린 자산 라이브러리 × 말풍선 자동 배치 × 인쇄 출판"의 교집합은 현재 시장에 없음.

| 제품 | 접근 | 한계 |
|---|---|---|
| Boords / LTX Studio / Katalist | 생성형(대본→샷 분해→AI 이미지) | 재현성 없음, 결과가 평면 픽셀(컷 교체=재생성 도박), 말풍선·인쇄 미지원 |
| StoryTribe / Storyboarder | 자산 조립형 | 대본 자동 분해 없음(전량 수동), Storyboarder는 유지보수 정체 |
| Dashtoon Studio (최근접, $13M A) | 웹툰 특화 생성형(패널+말풍선) | 완성작 생성(작화 대체) → 작가 반발·저작권 리스크 |
| 네이버웹툰 (AI Painter·SHAPER) | 작가 개별 공정 보조 | 콘티 자동화는 의도적 공백(창작자 반발 리스크) |

**포지션**: "완성작 생성기가 아니라 **편집 가능한 콘티 에디터**". 차별점 = 결정론 재현성(시드 계약),
객체 단위 편집(fabric 레이어), 말풍선 화자 자동 추적(키포인트), POD 인쇄(preflight), 라이선스 클린(사이드카 강제).

### 2.2 단계 설계

**CONTI-01 — 장면 메타 실가동·영속화** (🚦 API 키 — AI-ACT-03과 동일 게이트)
- LLM enhance를 콘티 경로에서 활성화 + 컨텍스트 확대(현행 장면당 100자 발췌는 근거 부족)
- 어휘 확장: cameraAngle 5값에 **샷사이즈(WS/MS/CU)·view** 추가 → R2~R4 분할 규칙 발화 시작
- 영속화는 마이그레이션 없이: `SceneDoc.meta`(기존 Json 컬럼)에 장면별 전체 메타 저장. Scene 컬럼 확장은 추후 휴먼게이트
- 동기 라우트 타임아웃 리스크 → Inngest 비동기화. 캐싱은 M4-01-03 캐시 패턴(개발·CI $0)

**CONTI-02 — 콘티 시트 합성기 + PDF** (키 불요, 즉시 착수 가능)
- `buildPageFabricJson` 선례대로 서버측 순수함수로 콘티 시트 fabricJson 합성:
  컷 그리드(2×4) + 컷별 [컷번호·샷사이즈·화자·대사·지문] + 포즈/배경 썸네일
- 템플릿은 `default-templates.ts`의 'default-3panel' 패턴으로 `conti-2x4` 추가. **pdf-engine 무수정 통과**
  (rect/image/text 커맨드로 전부 표현, comicmaker 프리플라이트 그대로). 성능 여유 큼(16p 8~17ms)
- publish API에 `conti: true` 옵션으로 본문 앞 콘티 시트 append

**CONTI-03 — 콘티 뷰 UI** (`/ui-spec` SOP 대상)
- import 마법사에 "콘티 미리보기" 단계: 대본 → **콘티 확정 → 페이지 생성** 순서로 변경
  → full-pipeline 재실행의 SceneDoc·Page 전체 덮어쓰기(사용자 편집 손실) 리스크 구조적 회피
- 컷 리스트는 PagePanel(썸네일+DnD) 패턴, 컷 교체는 기존 alternatives UI 재사용. 벤치마크: Katalist 앵글 선택 UI
- 주의: 마법사 `Math.random()` 시드는 ADR-0007과 충돌 → "시드 고정+재생성 버튼" UX로 정리

---

## 3. 제안 B — 포즈 3D화·양산 파이프라인

### 3.1 프레임 전환: 베이스 4~10종만 3D화

```
체형별 T/A-pose 턴어라운드 시트(2D 준비)
  → AI 이미지→3D (Tripo/Meshy/Rodin, 10종 $10~30) + 사람 클린업 1패스(체당 수시간~1일)
  → 리깅 (Blender Rigify 또는 AccuRig 2.0 무료 — 산출물 100% 자사 소유)
  → 포즈 적용 (라이선스 안전 소스: 사내 Pose Library 제작 주력 + 상업허용 포즈팩 보강)
  → Blender headless 배치: EEVEE 툰셰이딩 + Line Art, 카메라 4방위 자동
  → 투명 PNG(min side ≥ 2,048px → lowDpi 해소) + 본 관절 투영 → 25점 정밀 키포인트 사이드카
  → scripts/ingest-poses.ts 그대로 재적재 (사이드카 우선 로직·임베딩·파일명 사전 기배선)
```

결정적 이점: ①키포인트가 추정이 아닌 **정확값**으로 공짜 산출(말풍선 추적·소품 부착 기능 활성화)
②재렌더=동일 출력(ADR-0007 정합) ③리깅 자산은 M10+(AI 영상·더빙)·three.js 실시간 포즈 편집의 기반.

### 3.2 라이선스 지뢰 (공식 원문 확인)

| 항목 | 판정 |
|---|---|
| Hunyuan3D 2.x | LICENSE Territory **대한민국 명시 제외** — 채택 금지 |
| AMASS / SMPL-X | 비상업 전용 명문화 — 상업 라이선스 별도 협상 전 사용 불가 |
| Mixamo | 무료·상업 OK이나 "독립 자산 재배포 금지" — 편집기 자산 서빙은 회색지대 + 사실상 방치 서비스. 법률 검토 전 보조로만 |
| 안전 경로 | 사내 Blender Pose Library(주력) + 상업허용 포즈팩(보강) + Rigify/AccuRig |

**진짜 크리티컬 패스는 기술이 아니라 합법적 포즈 소스 확보.** 비용 본체는 SaaS 크레딧이 아니라
클린업·툰 룩 아트디렉션·검수 인건비(파이프라인 구축 3~6주 추정).

### 3.3 3루트 비교

| 축 | 3D 렌더(주력) | 2D 생성(보조) | 하이브리드(파일럿 검증) |
|---|---|---|---|
| 키포인트 | 릭 투영 = 정확 25점 무료 | DWPose 재추정(만화풍 한계) | 3D 값 사용 |
| 재현성(ADR-0007) | 재렌더=동일 | 모델 버전 종속, 보장 불가 | 부분 보장 |
| 앵글 일관성 | 4방위 기하 보장 | 뷰 간 동일 포즈 보장 불가 | 3D가 보장 |
| 신규 포즈 한계비용 | 분 단위 자동 | 확률 생성+검수 반복 | 중간 |
| 검수 부하 | 샘플링 검수 | 손/얼굴 파탄 전수 검수 | 중간 |
| 스타일 재현 | 툰셰이더 아트디렉션 필요 | LoRA로 기존 그림체 근접 | 3D 구도 + 2D 스타일 패스 |
| 법적 지위 | 자체 제작 — 방어력 최상 | AI 산출물 저작권 등록 불가(韓) | 중간 |
| 인프라 | Blender 배치(무료) | GPU + 모델 라이선스 개별 확인 | 양쪽 |

**파일럿**: 체형 1종 × 포즈 20 × 앵글 4 = 80장, 총 $50 미만(Tripo·Meshy·Rodin A/B).
DoD: 클린업 공수 실측 + 기존 그림체와의 스타일 수용성 평가 + ingest 라운드트립 + 말풍선 추적 개선 측정.
실패 시 외주 폴백(체당 $500~3,000) 상시 열려 있음.

---

## 4. OSS/모델 조사 — 단계별 채택 매핑

### 4.1 대본 분석: 한국어 화자귀속 3단 하이브리드

설계 근거(NAACL 2025): **명시적 인용(발화동사 인접)은 룰로 거의 완벽, 암시적/생략만 LLM 필요.**
한국어 기성 공개 모델은 HF에 사실상 없음(KLUE에 coref 태스크 자체가 없음) → 자체 구축이 전제.

```
1층 룰:      Kiwi 형태소(발화동사 어간 매칭으로 활용형 전체 커버) + 따옴표 규약 delimiter 플러그인
2층 스코어러: BookNLP식 캐릭터 ID 레지스트리 + CSN식 후보 스코어링(klue/roberta 재현,
             한국어 웹소설 적용 사례 80.2% = 비-LLM 현실 베이스라인)
3층 LLM:     저신뢰 케이스만 Claude 폴백 → confidence+alternatives[] 계약 유지
```

| 프로젝트 | 라이선스 | 판정 | 용도 |
|---|---|---|---|
| [BookNLP](https://github.com/booknlp/booknlp) | MIT | 패턴참고 | 4단계 구조(NER→이름 클러스터링→coref→인용귀속). **캐릭터 ID 레지스트리가 에셋 매핑과 접합** |
| [Kiwi](https://github.com/bab2min/Kiwi) | LGPL v3 | 직접채택(프로세스 분리) | 형태소·문장분리. 2026-06 활발. 보조: Kss(BSD-3) |
| [CSN-SAPR](https://github.com/YueChenkkk/CSN-SAPR) | 미확인 | 패턴참고 | 후보 스코어링+화자 교대 보정. 한국어 적용 논문 80.2% |
| [deezer NAACL 2025](https://github.com/deezer/llms_quotation_attribution) | 미확인 | 패턴참고 | LLM 화자귀속 SOTA 근거 + 평가 프로토콜(암기 오염 통제) |
| [fastcoref/LingMess](https://github.com/shon-otmazgin/fastcoref) | MIT | 영어 직접채택 / 한국어 패턴 | 상업 가능 coref 중 최선. **Maverick/xCoRe는 CC BY-NC-SA — 금지** |
| [KLUE](https://github.com/KLUE-benchmark/KLUE) | CC BY-SA 4.0 | 조건부 | klue/roberta 백본. SA 전염 논점·웹소설 도메인 전이 검증 필요 |
| [gutenberg-dialog](https://github.com/ricsinaruto/gutenberg-dialog) | MIT | 포크 | 언어별 delimiter 플러그인 패턴(한국어 따옴표 규약 추가) |
| [screenplay-tools](https://github.com/wildwinter/screenplay-tools) | MIT | 조건부 채택 | Fountain/FDX 임포트(외부 작가 유입구). 한국 시나리오 관행(S#) 호환 검증 필요 |
| [PDNC](https://github.com/Priya22/project-dialogism-novel-corpus) | 미명시 | 스키마 차용 | **화자+청자** 어노테이션 스키마 → "한국어 LitBank" 자체 코퍼스 = 중기 해자 |
| 국립국어원 모두의 말뭉치 | 코퍼스별 상이 | 조건부 | 한국어 coref 학습 유일 공식 소스. 상업 학습 가능 여부 개별 약관 확인 필수 |
| GLiNER / Dramatron / EXAONE 등 | Apache 등 | 검토 대상 | 비평 추가 지목: 제로샷 NER·계층적 대본 생성·자가호스팅 LLM 폴백 |

장면 분할: 현행 F1 0.899는 학계 기준(exact boundary F1) 이미 상위권. 개선은
"시간·장소·인물구성 3축 변화 감지" 명시 피처 추가(Zehe EACL 2021 정의) 수준으로 충분.

### 4.2 레이아웃: "LLM 제안자 + 결정론 심판" 하이브리드

| 기법(출처) | StoryWork 적용 |
|---|---|
| 후보 N개 → ranker (LayoutPrompter, MIT) | 기존 confidence+alternatives 계약과 동일. ranker=룰 점수(겹침·safe·lowDpi)로 결정론 유지 |
| k-similar 예시 검색 (LayoutGPT MIT, RALF Apache) | **pgvector 재사용** — 장면 임베딩→유사 장면의 확정 레이아웃 few-shot 주입 |
| 부분 확정+마스크 완성 (LayoutNUWA MIT, LayoutDM Apache) | 룰 확정 슬롯 고정, 빈칸만 LLM 제안 |
| 직렬화 | Zod 검증 JSON + 0..1 정규화 좌표 (CSS 직렬화는 2026 Claude엔 불필요 — 비평 판정) |

- **결정론 충돌 해소(비평 반영)**: temperature 0으로도 API 완전 결정론은 보장 불가 →
  **LLM 출력은 '실행'이 아니라 '데이터'로 영속화**(제안 JSON을 버전과 함께 저장, 재실행 시 재사용).
- LLM 패널 계획 스키마 3계보 종합: AI Comic Factory(Apache, 아카이브)의 렌더링 지시/표시 텍스트 분리
  (`instructions` vs `speech/caption`) + AutoStudio 프롬프트북의 **캐릭터 영속 ID+bbox 3튜플**
  (StoryWork는 영속 ID=에셋 ID로 무비용 해결) + MM-StoryAgent(Apache)의 Writer-Reviewer 루프.
  단 AutoStudio/TheaterGen/DiffSensei/Anim-Director는 LICENSE 없음 → 아이디어만, 코드 열람 금지.
- [panel-order-estimator](https://github.com/manga109/panel-order-estimator)(MIT) 직접 채택 —
  읽기순서 tree-cut을 배치 검증기로(한국식 좌→우는 순회 방향만 반전).
- **세로 스크롤 웹툰 문법은 공개 생태계 전체가 공백**(검출 측만 존재) — 컷 간 여백=템포 룰+데이터
  자체 축적 시 차별화 자산. 단 POD 인쇄 중심 SSOT와의 우선순위는 제품 결정 필요(§6).

### 4.3 말풍선: 비용함수 정식화 + 자동 QA

말풍선 '배치' 자동화는 재사용 가능 오픈소스가 없고 논문 패턴만 존재 — 현행 mouth 키포인트 설계가
이미 SOTA 패턴과 부합. 비용함수 명시화:

```
cost = w1·(화자 mouth 근접+꼬리 각도) + w2·중요영역(얼굴 bbox) 가림 페널티
     + w3·읽기순서 단조성 위반 + w4·패널 경계 침범        ← 전부 결정론 룰
```

| 자원 | 라이선스 | 판정 | 용도 |
|---|---|---|---|
| [MAGI v1/v2/v3](https://github.com/ragavsachdeva/magi) | 연구·비영리 전용 | 패턴참고(협의 전 투입 금지) | tail-aware 화자연결의 역함수=배치 비용함수. 배치 품질 평가 지표 차용 |
| [comic-translate](https://github.com/ogkalu2/comic-translate) | Apache-2.0 | 포크/부분채택 | 말풍선 검출+한국어 OCR(웹툰 1급). 배치 후 자동 QA(재검출로 겹침·가림 확인) |
| [ogkalu YOLOv8 검출기](https://huggingface.co/ogkalu/comic-speech-bubble-detector-yolov8m) | 가중치 Apache / 런타임 AGPL | **조건부**(비평 강등) | ONNX 변환+onnxruntime 필수. ultralytics 직접 사용 금지 |
| Manga109-s (87권) | 커스텀(상업 실험+결과 상업이용 허용) | 조건부(gated 신청) | 패널 밀도·크기 분포 통계→레이아웃 룰 보정. 원본 Manga109는 학술 전용 |
| 화자+청자 동시 식별 연구(2024) | 논문 | 패턴참고 | 꼬리 방향("누구에게") 추론 태스크 정의 |

### 4.4 캐릭터 에셋 플랫폼 (최종 목표: 작가 에셋 등록·판매)

**작가 캐릭터 등록 → 포즈 세트 반자동 양산** 상업 안전 스택:

```
업로드 시트 → DWPose(Apache — CMU OpenPose는 비상업이라 금지) 포즈·키포인트 추출
  → [즉석 미리보기] Qwen-Image-Edit / OmniGen2 (유이한 Apache-2.0 identity 편집 모델)
  → [정밀 양산] kohya sd-scripts(Apache, 활발)로 캐릭터 LoRA(10~30장, 24GB GPU 1~3h)
     + 포즈 배터리(보유 포즈 키포인트→OpenPose 스켈레톤→xinsir SDXL ControlNet, Apache)
  → identity 유사도+태거 자동 필터(deepghs/imgutils MIT) → 작가 검수 큐 → 기존 ingest 재적재
```

핵심: 생성물을 "생성형 서비스"가 아니라 **PNG 에셋으로 인입** → 자산 조립형 차별점(편집·재현·검수) 유지.
백본 이원화(비평 반영): 포즈 조건 생성=SDXL/Illustrious 라인(한국 기업 Onoma AI 제작, 라이선스 개별 확인),
identity 편집=Qwen-Image-Edit. FLUX는 schnell(Apache)만 예외, dev 파생 전체(AnyStory·PuLID-FLUX 등) 비상업.

| 자원 | 라이선스 | 판정 | 용도 |
|---|---|---|---|
| [Qwen-Image(-Edit)](https://github.com/QwenLM/Qwen-Image) | Apache-2.0 | 1순위 후보(벤치 후 채택) | identity 보존 편집. 20B — 서버 GPU + Inngest 잡 |
| [OmniGen2](https://github.com/VectorSpaceLab/OmniGen2) | Apache-2.0 | 대안 후보 | 경량 subject-driven. Qwen과 자체 벤치 비교 |
| [kohya sd-scripts](https://github.com/kohya-ss/sd-scripts) | Apache-2.0 | 직접채택 | 캐릭터 LoRA 학습 코어(2026-07 활발) |
| [ai-toolkit](https://github.com/ostris/ai-toolkit) | MIT | 부분채택 | 학습 잡 오케스트레이션 패턴("LoRA training as a service" 원형) |
| [fluxgym](https://github.com/cocktailpeanut/fluxgym) | MIT | UX 패턴 | "이미지 선택→자동 캡션→시작" 3단 온보딩. 백엔드는 SDXL/Qwen으로 교체 |
| [DWPose](https://github.com/IDEA-Research/DWPose) | Apache-2.0 | 직접채택 | 포즈 추출 표준. 기존 1,058장 키포인트 일괄 보강에도 사용 |
| [xinsir controlnet-openpose-sdxl](https://huggingface.co/xinsir/controlnet-openpose-sdxl-1.0) | Apache-2.0 | 직접채택 | 포즈 조건부 생성 부품 |
| [InstantCharacter](https://github.com/Tencent/InstantCharacter) | 상업 금지(원문 확인) | **부적합** | — |
| [SimpleTuner](https://github.com/bghira/SimpleTuner) | AGPL-3.0 | **부적합** | SaaS 소스 공개 의무 리스크 |
| [pixai-tagger-v0.9](https://huggingface.co/pixai-labs/pixai-tagger-v0.9) | Apache-2.0 | 1차 필터 한정 | IP 침해 스크리닝(캐릭터 4,000종 F1 0.865). 일본 IP 위주 → 한국 웹툰 IP는 자체 pgvector 인덱스 병행 |
| [wd-swinv2-tagger-v3](https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3) | Apache-2.0 | 부분채택 | 태거 앙상블 + LoRA 자동 캡셔닝 |
| [VRM 1.0 VRMC_vrm meta](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/meta.md) | 사양 공개 | **스키마 이식** | 기계판독 라이선스: commercialUsage 3단 enum(개인비영리/개인영리/법인)·재배포·개작·크레딧·**미기재 시 최보수 기본값** → PoseSidecar.license 확장 |
| [VRoid Hub 이용조건 가이드라인](https://developer.vroid.com/en/guidelines/conditions_of_use.html) | 문서 | UI 참고 | 조건 아이콘 표준(연동 앱 상시 표시 의무) → 마켓 상세·에디터 내 노출 |
| Live2D 라이선스 모델 | 상용 | 반면교사 | 매출 임계 단계 과금(수수료 25% 설계 비교 대상). UGC 플랫폼 특약 심사 주의 |
| [Inochi2D](https://github.com/Inochi2D/inochi2d) | BSD-2 | 패턴참고 | INP 단일파일 패키징 → 에셋 팩(포즈+사이드카+라이선스+썸네일) 배포 포맷 |
| CopyJudge (arXiv 2502.15278) | 논문 | 패턴참고 | 태거 플래그→멀티모달 LLM 판정→인간 검수 3단 구조의 학술 근거 |

IP 스크리닝 3단: 태거 앙상블(임계 초과→검수 큐) → Claude 멀티모달 판정 → 인간 최종 검수.
마켓 OSS 대안(Booth/VRoid Hub급)은 공백 — 자체 구축 불가피하나 경쟁 부재는 기회.

---

## 5. 라이선스 가드레일 (채택 전 체크리스트)

**원칙: 코드 라이선스가 아니라 가중치 계보(베이스 모델)를 확인하라.**

| 등급 | 목록 |
|---|---|
| ✅ 채택 가능 | DWPose · kohya sd-scripts · ai-toolkit · Qwen-Image · OmniGen2 · xinsir ControlNet · comic-translate · panel-order-estimator · fastcoref(영어) · Kiwi(프로세스 분리) · Kss · gutenberg-dialog · screenplay-tools · MM-StoryAgent · imgutils · pixai/wd 태거 · SAM2 · BiRefNet · TRELLIS+UniRig(3D 오픈 경로) |
| ⚠️ 조건부 | Manga109-s(용도 명시 승인) · ogkalu 검출기(ONNX 경로) · KLUE(SA 전염 검토) · 국립국어원 말뭉치(개별 약관) · Illustrious/NoobAI(모델별) · Mixamo(법률 검토 후 보조만) · FLUX.1-schnell만(dev 아님) |
| ❌ 금지 | Maverick/xCoRe(NC) · InstantCharacter(상업금지) · FLUX.1-dev 파생 전체 · MAGI 모델·데이터(연구전용) · CMU OpenPose · Manga109 원본 · AMASS/SMPL-X(비상업) · Hunyuan 계열(한국 제외) · AGPL류(SimpleTuner·ultralytics 런타임·Kumiko) |

---

## 6. 통합 로드맵 제안

| 항목 | 내용 | 게이트 |
|---|---|---|
| CONTI-01 | 장면 메타 실가동(LLM enhance+샷사이즈 어휘)·SceneDoc.meta 영속화·Inngest 비동기 | 🚦 API 키 |
| CONTI-02 | 콘티 시트 합성기(fabricJson)+conti-2x4 템플릿+PDF(`conti:true`) | 없음 — 즉시 가능 |
| CONTI-03 | 콘티 미리보기 UI(마법사 단계 삽입, PagePanel·alternatives 재사용) | /ui-spec SOP |
| SCRIPT-KO-01 | Kiwi 어간 발화동사+따옴표 delimiter+캐릭터 ID 레지스트리 | 없음 — 즉시 가능 |
| SCRIPT-KO-02 | 한국어 화자·청자 평가셋(PDNC 스키마)+Claude 폴백 계층 | 🚦 API 키 |
| SCRIPT-KO-03 | CSN식 스코어러(klue/roberta) 자체 학습 | 🚦 말뭉치 약관·GPU |
| LAYOUT-02 | LLM 레이아웃 제안자(JSON+Zod, pgvector k-similar)+룰 ranker+제안 영속화 | 🚦 API 키 |
| LAYOUT-03 | panel-order 검증기 이식+Manga109-s 통계 룰 보정 | ⚠️ gated 신청 |
| BUBBLE-02 | 배치 비용함수 4항 정식화+검출기 자동 QA(ONNX) | 없음 |
| POSE3D-01 | 3D 파일럿: 체형 1종×포즈 20×앵글 4, Tripo/Meshy/Rodin A/B($50 미만) | 🚦 SaaS 결제 |
| POSE3D-02 | Blender headless 배치 파이프라인 프로덕션화(2,048px+·사이드카 자동) | 🚦 법무·아트디렉션 |
| CHAR-GEN-01 | DWPose로 기존 자산 키포인트 일괄 보강(3점→다점) | GPU만 |
| CHAR-GEN-02 | 작가 캐릭터 파일럿: 시트→LoRA→포즈 배터리→검수→인입(3종 벤치) | 🚦 GPU·정책 |
| MARKET-00 | 에셋 라이선스 메타 VRM식 확장+IP 스크리닝 3단+조건 아이콘 UI(MARKET-01 선행) | 법무 병행 |

**실행 순서 제안**: P0(1주) = CONTI-02 + SCRIPT-KO-01 (+3D 파일럿, 결제 승인 시)
→ P1(2~3주) = CONTI-01/03 + LAYOUT-02 → P2(3~6주) = POSE3D-02 + CHAR-GEN + MARKET-00.
콘티 수요 데이터(요구 액션·뷰 분포)가 포즈 양산 우선순위를 결정하는 것이 두 트랙의 접착제.

---

## 7. 리스크·미결정 사항

**제품 결정 필요(휴먼게이트)**
1. 세로 스크롤 웹툰 모드 vs POD 인쇄 우선순위 — 웹툰 문법 공백은 기회이나 SSOT는 인쇄 중심
2. 생성 보조 에셋의 마켓 정책 — "라이선스 청정" 차별점과의 긴장. 생성 에셋 별도 티어 분리 표시 권장

**법무(FOLLOWUP-60에 병합 권장)**
- AI 기본법(2026-01-22 시행): 생성형 AI 산출물 표시 의무(위반 시 과태료 최대 3천만원) + C2PA 출처 증명 검토
- 한국은 AI 산출물 자체 저작권 등록 불가(인간 기여분만) → 법적 방어력 서열: 자체 모델링 > AI 3D+클린업 > 순수 2D 생성
- Mixamo 재배포 조항 해석 / 국립국어원 말뭉치 상업 학습 약관 / Manga109-s 신청 문구
- Gemini 산출물 SynthID 워터마크: AI 기본법 기계판독 요건에 오히려 유리할 수 있음

**정량 근거의 한계**
- 생성 수율("80~95% 일관성")은 전부 비공식 커뮤니티 수치 — 채택 전 자체 벤치(캐릭터 10종×포즈 20종) 필수
- 파이프라인 구축 기간(MVP 2~5일/프로덕션 3~6주)·렌더 처리량(EEVEE 프레임당 0.5~2초)은 유사 사례 기반 추정

---

## 8. 부록: 3D 생성 도구 요약 (2026-07 공식가 기준)

| 도구 | 가격 | 라이선스 | 특징 |
|---|---|---|---|
| Tripo AI | Pro $13.93/월(3,000cr), API $0.2~0.5/건+리깅 $0.25 | 유료 플랜 상업 OK | 생성→쿼드 리메시→오토리깅→T-pose 원루프. 1순위 |
| Meshy | Pro $20/월(1,000cr), 이미지→3D ≈$0.6 | 유료 완전 소유권 | 쿼드 리메시 명시 파라미터, 리깅 현재 무료 |
| Rodin Gen-2 | Creator $30/월(~60모델) | 유료 상업(약관 원문 재확인 필요) | **T/A-pose 강제 생성**(포즈 정규화 생략), 쿼드 최상 |
| TRELLIS+UniRig | 무료(GPU 비용) | MIT | 오픈 경로 유일 라이선스 청정 조합. 서비스 내재화 시 |
| CSM | — | — | 2026-01 Alphabet 인수·Cube 종료 — 후보 제외 |
| 외주(비교 기준) | 체당 $500~3,000 | 완전 양도 | 폴백. AI+클린업 하이브리드가 1/5~1/10 비용 |

_출처 전체(공식 LICENSE·가격 페이지 URL 포함)는 조사 워크플로 원본에 보존:
`wf_3b6b718c-39a`(콘티·3D), `wf_b05bdbcd-af4`(OSS/모델) — 세션 스크래치패드 파싱본 기준으로 본 문서 작성._
