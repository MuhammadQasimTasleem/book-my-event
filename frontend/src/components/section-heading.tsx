import { Sparkle } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  light = false,
}: Props) {
  return (
    <div
      className={`max-w-2xl ${
        align === "center" ? "mx-auto text-center" : "text-left"
      }`}
    >
      {eyebrow && (
        <div
          className={`flex items-center gap-3 ${
            align === "center" ? "justify-center" : "justify-start"
          }`}
        >
          <span className="h-px w-8 bg-gold-300/60" />
          <span className="font-script text-2xl text-gold-300">{eyebrow}</span>
          <span className="h-px w-8 bg-gold-300/60" />
        </div>
      )}
      <h2
        className={`mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl ${
          light ? "text-cream-50" : "text-espresso-200"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-5 text-base leading-8 ${
            light ? "text-cream-100/75" : "text-muted"
          }`}
        >
          {subtitle}
        </p>
      )}
      <div
        className={`mt-6 flex items-center gap-2 text-gold-300 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span className="h-px w-10 bg-gold-300/40" />
        <Sparkle size={14} />
        <span className="h-px w-10 bg-gold-300/40" />
      </div>
    </div>
  );
}
