"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Slider } from "@/lib/api-server";
import { cx } from "@/lib/format";

const THEMES: Record<string, string> = {
  blue: "from-brand-600 via-brand-700 to-brand-900",
  navy: "from-ink via-brand-900 to-brand-700",
  emerald: "from-accent-600 via-brand-700 to-brand-900",
  sunrise: "from-amber-500 via-brand-600 to-brand-900",
};

export function HeroSlider({ slides, children }: { slides: Slider[]; children?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [n, paused, go]);

  if (!n) return null;
  return (
    <section
      className="relative isolate overflow-hidden bg-ink"
      aria-roledescription="carousel" aria-label="Highlights"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}
    >
      {/* ~50% of the first screen on desktop */}
      <div className="relative min-h-[420px] sm:min-h-[440px] lg:h-[50vh] lg:min-h-[460px] lg:max-h-[560px]">
        {slides.map((s, k) => (
          <div key={s.id} className={cx("absolute inset-0 transition-opacity duration-700", k === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
            {s.image_url ? (
              <>
                <picture>
                  {s.mobile_image_url && <source media="(max-width: 640px)" srcSet={s.mobile_image_url} />}
                  <Image src={s.image_url} alt="" fill priority={k === 0} sizes="100vw" className="object-cover" />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/20" />
              </>
            ) : (
              <div className={cx("absolute inset-0 bg-gradient-to-br", THEMES[s.theme] ?? THEMES.blue)}>
                <svg className="absolute -right-24 -top-24 h-[520px] w-[520px] text-white/5" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 96C50 96 16 63 16 41A34 34 0 1 1 84 41C84 63 50 96 50 96Z" fill="currentColor" /></svg>
                <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />
              </div>
            )}
            <div className="container-page relative flex h-full flex-col justify-center pb-36 pt-10 sm:pb-32 lg:pb-28">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Surat&apos;s own job portal
                </p>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">{s.title}</h2>
                {s.subtitle && <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">{s.subtitle}</p>}
                {s.cta_label && s.cta_url && (
                  <Link href={s.cta_url} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-800 shadow-lg transition hover:bg-brand-50">
                    {s.cta_label} <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {n > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-[40%] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25 md:flex" aria-label="Previous slide">‹</button>
            <button onClick={() => go(1)} className="absolute right-3 top-[40%] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25 md:flex" aria-label="Next slide">›</button>
            <div className="absolute inset-x-0 bottom-[118px] z-10 flex justify-center gap-2 sm:bottom-[104px] lg:bottom-24">
              {slides.map((s, k) => (
                <button key={s.id} onClick={() => setI(k)} aria-label={`Go to slide ${k + 1}`} aria-current={k === i} className={cx("h-2 rounded-full transition-all", k === i ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/80")} />
              ))}
            </div>
          </>
        )}
        {/* Quick search sits over the bottom of the slider */}
        <div className="absolute inset-x-0 bottom-0 z-20 translate-y-0 pb-4 sm:pb-5">
          <div className="container-page">{children}</div>
        </div>
      </div>
    </section>
  );
}
