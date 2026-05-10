import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { href?: string; label: string };

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  crumbs = [],
  backgroundImage,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  backgroundImage?: string;
}) {
  return (
    <section className="relative isolate min-h-[280px] overflow-hidden bg-black text-cream-50">
      {backgroundImage ? (
        <>
          <div className="absolute inset-0 z-0">
            <Image
              src={backgroundImage}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              loading="eager"
            />
          </div>
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/92 via-black/80 to-black/94" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-10 bg-espresso-200" />
          <div className="absolute inset-0 -z-10 bg-hero-grain opacity-90" />
        </>
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="relative z-10 container-x py-24 text-center sm:py-32">
        {eyebrow && (
          <div className="flex items-center justify-center gap-3 text-gold-300">
            <span className="h-px w-8 bg-gold-300/60" />
            <span className="font-script text-2xl">{eyebrow}</span>
            <span className="h-px w-8 bg-gold-300/60" />
          </div>
        )}
        <h1 className="mt-3 font-serif text-5xl tracking-tight text-cream-50 drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)] sm:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-cream-100/85 drop-shadow-[0_1px_14px_rgba(0,0,0,0.75)]">
            {subtitle}
          </p>
        )}
        {crumbs.length > 0 && (
          <nav className="mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-cream-100/60">
            <Link href="/" className="hover:text-gold-300">
              Home
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight size={12} className="text-gold-300" />
                {c.href ? (
                  <Link href={c.href} className="hover:text-gold-300">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-gold-300">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
