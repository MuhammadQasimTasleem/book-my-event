import type { ReactNode } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  /** Overlay gradient corner */
  gradient?: "tr" | "tl";
};

/**
 * Half-width (lg+) hero for login/register: image uses object-contain so the full photo stays visible.
 */
export function AuthHeroPanel({
  src,
  alt,
  eyebrow,
  title,
  description,
  gradient = "tr",
}: Props) {
  const grad =
    gradient === "tl"
      ? "bg-gradient-to-tl from-espresso-300/80 via-espresso-200/35 to-transparent"
      : "bg-gradient-to-tr from-espresso-300/80 via-espresso-200/35 to-transparent";

  return (
    <div className="relative flex min-h-[min(42vh,420px)] flex-col bg-gradient-to-b from-espresso-400/20 to-espresso-300/30 lg:min-h-screen">
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-14 xl:py-16">
        <div className="relative h-[min(36vh,340px)] w-full max-w-xl sm:h-[min(40vh,400px)] lg:h-[min(78vh,820px)] lg:max-w-3xl xl:max-w-4xl">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain object-center"
            sizes="(max-width: 1023px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-0 ${grad}`}
        aria-hidden
      />
      <div className="pointer-events-none relative z-[1] mt-auto px-5 pb-8 pt-2 drop-shadow-[0_2px_12px_rgba(42,37,32,0.45)] sm:px-8 sm:pb-10 lg:px-10 lg:pb-12 lg:pt-4 xl:px-14 xl:pb-14">
        <span className="font-script text-2xl text-gold-300 sm:text-3xl">{eyebrow}</span>
        <div className="mt-2 font-serif text-3xl leading-tight text-cream-50 sm:text-4xl lg:text-5xl">
          {title}
        </div>
        {description ? (
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream-100 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
