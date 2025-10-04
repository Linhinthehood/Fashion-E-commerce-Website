import { useEffect, useMemo, useRef, useState } from 'react'
import './BannerCarousel.css'

type Slide = {
  id: string
  title: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  background?: string
  imageUrl?: string
}

type BannerCarouselProps = {
  slides?: Slide[]
  intervalMs?: number
}

export default function BannerCarousel({ slides: providedSlides, intervalMs = 4500 }: BannerCarouselProps) {
  const slides = useMemo<Slide[]>(() => providedSlides ?? [
    {
      id: 's1',
      title: 'New Season, New Styles',
      subtitle: 'Discover our latest arrivals for everyone',
      ctaText: 'Shop Now',
      ctaHref: '/c/apparel',
      background: 'from-pink-100 to-indigo-100'
    },
    {
      id: 's2',
      title: 'Accessories That Elevate',
      subtitle: 'Hats, watches, and more',
      ctaText: 'Explore Accessories',
      ctaHref: '/c/accessories',
      background: 'from-amber-100 to-rose-100'
    },
    {
      id: 's3',
      title: 'Step Into Comfort',
      subtitle: 'Footwear built for your lifestyle',
      ctaText: 'Browse Footwear',
      ctaHref: '/c/footwear',
      background: 'from-sky-100 to-emerald-100'
    },
  ], [providedSlides])

  const [index, setIndex] = useState(0)
  const timerRef = useRef<number | null>(null)

  const goTo = (i: number) => {
    setIndex((i + slides.length) % slides.length)
  }

  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  useEffect(() => {
    if (slides.length <= 1) return
    timerRef.current && window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, intervalMs)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [slides.length, intervalMs])

  return (
    <section className="banner relative rounded-xl overflow-hidden">
      <div className="banner-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s) => (
          <div key={s.id} className={`banner-slide bg-gradient-to-br ${s.background ?? 'from-gray-100 to-gray-200'}`}>
            <div className="banner-content">
              <h2 className="banner-title">{s.title}</h2>
              {s.subtitle && <p className="banner-subtitle">{s.subtitle}</p>}
              {s.ctaText && s.ctaHref && (
                <a href={s.ctaHref} className="banner-cta">
                  {s.ctaText}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button aria-label="Previous" className="banner-nav left" onClick={prev}>❮</button>
          <button aria-label="Next" className="banner-nav right" onClick={next}>❯</button>
          <div className="banner-dots" role="tablist" aria-label="Slide selector">
            {slides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={index === i}
                aria-controls={`slide-${s.id}`}
                className={`dot ${index === i ? 'active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

