'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useI18n } from '@/i18n';

export interface HeroSlide {
  src: string;
  i18nKey: 'slide1Location' | 'slide2Location' | 'slide3Location';
  fallbackLocation: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: '/hero/hero-1.webp',
    i18nKey: 'slide1Location',
    fallbackLocation: 'Central Province Terraced Farmlands',
  },
  {
    src: '/hero/hero-2.webp',
    i18nKey: 'slide2Location',
    fallbackLocation: 'Paddy fields, Anuradhapura',
  },
  {
    src: '/hero/hero-3.webp',
    i18nKey: 'slide3Location',
    fallbackLocation: 'Vegetable farm, Nuwara Eliya',
  },
];

interface HeroSlideshowProps {
  children?: React.ReactNode;
}

export function HeroSlideshow({ children }: HeroSlideshowProps) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 1. Detect prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 2. Preload the next image in background
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextIndex = (currentIndex + 1) % HERO_SLIDES.length;
    const nextSlide = HERO_SLIDES[nextIndex];
    if (nextSlide && !imageErrors[nextIndex]) {
      const img = new window.Image();
      img.src = nextSlide.src;
    }
  }, [currentIndex, imageErrors]);

  // 3. Tab visibility handling: pause timer when document is hidden
  const isDocumentVisible = useCallback(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  }, []);

  // 4. Auto-rotation interval (3 seconds)
  useEffect(() => {
    if (prefersReducedMotion || isPaused) return;

    const interval = setInterval(() => {
      if (isDocumentVisible()) {
        setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion, isDocumentVisible]);

  // 5. Keyboard navigation for tablist
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      targetIndex = (index + 1) % HERO_SLIDES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      targetIndex = (index - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = HERO_SLIDES.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      setCurrentIndex(targetIndex);
      tabRefs.current[targetIndex]?.focus();
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const currentSlide = HERO_SLIDES[currentIndex];
  const currentLocation =
    t(`hero.${currentSlide.i18nKey}`) || currentSlide.fallbackLocation;

  return (
    <div
      className="relative w-full overflow-hidden bg-gradient-to-b from-[#1B4D1E] to-[#2E7D32]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Absolute Stacked Image Layers for Cross-fade & Ken Burns Zoom */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const isError = imageErrors[idx];

          if (isError) {
            // Smooth gradient fallback if individual image failed to load
            return (
              <div
                key={slide.src}
                className={`absolute inset-0 bg-gradient-to-b from-[#1B4D1E] to-[#2E7D32] transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            );
          }

          return (
            <div
              key={slide.src}
              id={`hero-slide-${idx}`}
              role="tabpanel"
              aria-label={currentLocation}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div
                className={`relative w-full h-full transform transition-transform ease-out ${
                  isActive && !prefersReducedMotion
                    ? 'scale-[1.06] duration-[6000ms]'
                    : 'scale-100 duration-1000'
                } motion-reduce:transform-none`}
              >
                <Image
                  src={slide.src}
                  alt=""
                  aria-hidden="true"
                  fill
                  priority={idx === 0}
                  loading={idx === 0 ? undefined : 'lazy'}
                  sizes="100vw"
                  quality={75}
                  className="object-cover object-center"
                  onError={() => handleImageError(idx)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Brand Color Overlay (Natural Green Tone, AA text contrast, no heavy black) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top right, rgba(18, 51, 22, 0.75) 0%, rgba(27, 77, 30, 0.35) 100%)',
        }}
      />

      {/* Soft Bottom Fade into next section's sand-50 background (#FAF7F0) */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 h-16 sm:h-24 z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, #FAF7F0 0%, rgba(250, 247, 240, 0.6) 40%, transparent 100%)',
        }}
      />

      {/* Foreground Hero Content */}
      <div className="relative z-30 flex flex-col justify-between min-h-[70vh] lg:min-h-[80vh] py-16 sm:py-24 lg:py-28">
        <div className="flex-1 flex flex-col justify-center">
          {children}
        </div>

        {/* Slideshow Controls & Location Chip */}
        <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          {/* Pill Dots Indicator (tablist) */}
          <div
            role="tablist"
            aria-label="Hero background slideshow controls"
            className="flex items-center gap-2 p-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/20 shadow-md"
          >
            {HERO_SLIDES.map((slide, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={slide.src}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`hero-tab-${idx}`}
                  aria-selected={isSelected}
                  aria-controls={`hero-slide-${idx}`}
                  aria-label={t('hero.showSlide', { n: idx + 1 }) || `Show slide ${idx + 1}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setCurrentIndex(idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`h-2.5 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
                    isSelected
                      ? 'w-7 sm:w-8 bg-[#FDB600] shadow-sm'
                      : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>

          {/* Location Tag Chip */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-green-950/70 border border-white/20 text-white text-xs font-semibold shadow-md backdrop-blur-md transition-all duration-300"
            aria-live="polite"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span className="tracking-wide drop-shadow-sm">{currentLocation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
