'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export interface HeroSlideImage {
  src: string;
  alt: string;
}

export const HERO_IMAGES: HeroSlideImage[] = [
  {
    src: '/images/hero/hero-1.webp',
    alt: 'Lush green Sri Lankan paddy field during golden hour',
  },
  {
    src: '/images/hero/hero-2.webp',
    alt: 'Close-up of healthy crops with modern digital farm monitoring context',
  },
  {
    src: '/images/hero/hero-3.webp',
    alt: 'Agricultural extension officer discussing farm health with a local farmer',
  },
];

interface HeroBackgroundSliderProps {
  children?: React.ReactNode;
  className?: string;
}

export function HeroBackgroundSlider({ children, className = '' }: HeroBackgroundSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-cycle through images every 3000ms (3 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative w-full min-h-[70vh] lg:min-h-[80vh] overflow-hidden bg-slate-900 ${className}`}
    >
      {/* Background Image Slides Stacked Absolutely for Smooth Crossfade */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {HERO_IMAGES.map((image, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={image.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={idx === 0}
                sizes="100vw"
                quality={80}
                className="object-cover object-center"
              />
            </div>
          );
        })}
      </div>

      {/* Readability Overlay: Dark gradient/tint overlay maintaining WCAG AA contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[2] pointer-events-none bg-slate-900/50 bg-gradient-to-t from-slate-950/80 via-slate-900/50 to-slate-900/40"
      />

      {/* Soft Bottom Transition into the Next Section */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 h-16 sm:h-24 z-[3] pointer-events-none bg-gradient-to-t from-[#FAF7F0] via-[#FAF7F0]/60 to-transparent"
      />

      {/* Foreground Content (Higher Z-Index Container z-10) */}
      {children && (
        <div className="relative z-10 w-full min-h-[70vh] lg:min-h-[80vh] flex flex-col justify-between py-16 sm:py-24 lg:py-28">
          <div className="flex-1 flex flex-col justify-center">
            {children}
          </div>

          {/* Indicator Dots */}
          <div
            role="tablist"
            aria-label="Hero background image slider"
            className="mt-8 flex items-center justify-center gap-2 px-4"
          >
            {HERO_IMAGES.map((image, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={image.src}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Show slide ${idx + 1}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isSelected
                      ? 'w-8 bg-[#FDB600] shadow-sm'
                      : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeroBackgroundSlider;
