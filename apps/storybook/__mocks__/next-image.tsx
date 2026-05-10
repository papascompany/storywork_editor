/**
 * next/image mock for Storybook (Vite, no Next.js runtime)
 * renders a plain <img> element, ignoring Next.js-specific props
 */
import * as React from 'react'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fill?: boolean
  sizes?: string
  priority?: boolean
  quality?: number
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
  loader?: unknown
  onLoadingComplete?: unknown
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    fill,
    sizes: _sizes,
    priority: _priority,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    unoptimized: _unoptimized,
    loader: _loader,
    onLoadingComplete: _onLoadingComplete,
    style,
    ...rest
  },
  ref,
) {
  const imgStyle: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }
    : (style ?? {})

  return <img src={src} alt={alt} style={imgStyle} ref={ref} {...rest} />
})
Image.displayName = 'Image'

export default Image
