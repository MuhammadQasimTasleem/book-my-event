"use client";

type TagBlockProps = {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (next: string[]) => void;
};

export function TagBlock({ label, placeholder, tags, onChange }: TagBlockProps) {
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const el = e.currentTarget;
    const raw = el.value.trim();
    el.value = "";
    if (!raw) return;
    if (tags.some((x) => x.toLowerCase() === raw.toLowerCase())) return;
    onChange([...tags, raw]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <input
        className="input normal-case"
        placeholder={placeholder}
        onKeyDown={onKeyDown}
      />
      <ul className="flex min-h-[2rem] flex-wrap gap-2">
        {tags.map((t) => (
          <li
            key={t}
            className="flex items-center gap-1 rounded-full border border-espresso-200/15 bg-cream-100/80 px-2.5 py-1 text-xs text-espresso-200"
          >
            {t}
            <button
              type="button"
              className="rounded px-0.5 text-rose-600 hover:bg-rose-50"
              aria-label={`Remove ${t}`}
              onClick={() => remove(t)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServiceOfferingFields({
  eventTypes,
  onChangeEventTypes,
  serviceOptions,
  onChangeServiceOptions,
}: {
  eventTypes: string[];
  onChangeEventTypes: (v: string[]) => void;
  serviceOptions: string[];
  onChangeServiceOptions: (v: string[]) => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TagBlock
        label="Event types"
        placeholder="e.g. Wedding — press Enter to add"
        tags={eventTypes}
        onChange={onChangeEventTypes}
      />
      <TagBlock
        label="Included amenities / options"
        placeholder="e.g. Stage lighting — Enter to add"
        tags={serviceOptions}
        onChange={onChangeServiceOptions}
      />
    </div>
  );
}
