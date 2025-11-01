import { useEffect, useMemo, useRef, useState } from 'react'
import './BannerCarousel.css'
import banner1 from '../assets/banner1.png'
import banner2 from '../assets/banner2.png'
import banner3 from '../assets/banner3.jpg'

type Slide = {
  id: string
  imageUrl?: string
  imageAlt?: string
}

type BannerCarouselProps = {
  slides?: Slide[]
  intervalMs?: number
}

export default function BannerCarousel({ slides: providedSlides, intervalMs = 4500 }: BannerCarouselProps) {
  const slides = useMemo<Slide[]>(() => providedSlides ?? [
    {
      id: 's1',
      imageUrl: banner1,
      imageAlt: 'Fashion banner 1'
    },
    {
      id: 's2',
      imageUrl: banner2,
      imageAlt: 'Fashion banner 2'
    },
    {
      id: 's3',
      imageUrl: banner3,
      imageAlt: 'Fashion banner 3'
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
          <div key={s.id} className="banner-slide">
            {s.imageUrl && (
              <img src={s.imageUrl} alt={s.imageAlt ?? 'banner'} className="banner-image" loading="lazy" />
            )}
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

