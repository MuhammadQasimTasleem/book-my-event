import { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "gold",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "gold" | "ink";
}) {
  return (
    <div className="rounded-2xl border border-espresso-200/10 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${
            tone === "gold"
              ? "bg-gold-300/15 text-gold-400"
              : "bg-espresso-200 text-cream-50"
          }`}
        >
          <Icon size={18} />
        </span>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          {label}
        </p>
      </div>
      <p className="mt-4 font-serif text-3xl text-espresso-200">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
