import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react'

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP)

export interface SplitTextProps {
  text: string
  className?: string
  /** Delay between each piece, in ms. */
  delay?: number
  /** Duration of each piece's animation, in seconds. */
  duration?: number
  ease?: string
  splitType?: 'chars' | 'words' | 'lines' | 'words, chars'
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  /** Fraction of the element that must be visible to start. */
  threshold?: number
  rootMargin?: string
  textAlign?: CSSProperties['textAlign']
  tag?: ElementType
  onLetterAnimationComplete?: () => void
}

export default function SplitText({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag: Tag = 'p',
  onLetterAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null)
  const done = useRef(false)
  const [fontsLoaded, setFontsLoaded] = useState(
    () => document.fonts.status === 'loaded',
  )

  useEffect(() => {
    if (!fontsLoaded) document.fonts.ready.then(() => setFontsLoaded(true))
  }, [fontsLoaded])

  useGSAP(
    () => {
      const el = ref.current
      if (!el || !text || !fontsLoaded || done.current) return

      // rootMargin like "-100px" or "-10%" becomes a ScrollTrigger start offset.
      const match = /^(-?\d+(?:\.\d+)?)(px|%)?/.exec(rootMargin)
      const value = match ? parseFloat(match[1]) : 0
      const unit = match?.[2] ?? 'px'
      const sign = value < 0 ? `-=${Math.abs(value)}${unit}` : `+=${value}${unit}`
      const start = `top ${(1 - threshold) * 100}%${sign}`

      const targetFor = (s: GSAPSplitText) => {
        if (splitType.includes('chars') && s.chars.length) return s.chars
        if (splitType.includes('words') && s.words.length) return s.words
        if (splitType.includes('lines') && s.lines.length) return s.lines
        return s.chars
      }

      const split = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: (self) => {
          const tween = gsap.fromTo(
            targetFor(self),
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              scrollTrigger: { trigger: el, start, once: true },
              onComplete: () => {
                done.current = true
                onLetterAnimationComplete?.()
              },
              willChange: 'transform, opacity',
              force3D: true,
            },
          )
          return tween
        },
      })

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill()
        })
        split.revert()
      }
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
      ],
      scope: ref,
    },
  )

  const style: CSSProperties = {
    textAlign,
    display: 'inline-block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    willChange: 'transform, opacity',
  }

  return (
    <Tag ref={ref} style={style} className={`split-parent ${className}`}>
      {text}
    </Tag>
  )
}
