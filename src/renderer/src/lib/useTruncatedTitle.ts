import { useCallback, useRef } from 'react'

/**
 * Returns a ref and mouse-enter handler for an element whose `title` should
 * show `fullText` only when its visible text is truncated (scroll width
 * exceeds client width). If the text fits, the `title` is cleared so no
 * tooltip appears.
 */
export function useTruncatedTitle(fullText: string): {
  ref: (element: HTMLElement | null) => void
  onMouseEnter: () => void
} {
  const elementRef = useRef<HTMLElement | null>(null)

  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element
  }, [])

  const onMouseEnter = useCallback(() => {
    const element = elementRef.current
    if (!element) return
    if (element.scrollWidth > element.clientWidth) {
      element.title = fullText
    } else {
      element.removeAttribute('title')
    }
  }, [fullText])

  return { ref, onMouseEnter }
}
