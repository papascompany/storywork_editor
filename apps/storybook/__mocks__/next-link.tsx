/**
 * next/link mock for Storybook (Vite, no Next.js runtime)
 * renders a plain <a> element with the same props
 */
import * as React from 'react'

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, ...rest },
  ref,
) {
  return (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  )
})
Link.displayName = 'Link'

export default Link
