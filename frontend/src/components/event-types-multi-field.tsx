"use client";

import { TagBlock } from "@/components/service-offering-fields";
import {
  EVENT_MULTI_PRESETS,
  type EventPresetKey,
} from "@/lib/service-presets";

type Props = {
  selectedPresetKeys: EventPresetKey[];
  onChangePresetKeys: (keys: EventPresetKey[]) => void;
  customTags: string[];
  onChangeCustomTags: (tags: string[]) => void;
  /** Shorter hint when using the multi-row batch form */
  mode?: "default" | "batch";
};

export function EventTypesMultiField({
  selectedPresetKeys,
  onChangePresetKeys,
  customTags,
  onChangeCustomTags,
  mode = "default",
}: Props) {
  const toggle = (key: EventPresetKey) => {
    if (selectedPresetKeys.includes(key)) {
      onChangePresetKeys(selectedPresetKeys.filter((k) => k !== key));
    } else {
      onChangePresetKeys([...selectedPresetKeys, key]);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-espresso-200/15 bg-cream-50/40 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Event types (select all that apply)
        </p>
        <p className="mt-1 text-xs text-muted">
          {mode === "batch" ? (
            <>
              Tick every event this <strong>row</strong> applies to; the same per-head tier
              prices apply to each.
            </>
          ) : (
            <>
              One row = one service (e.g. Food or Catering) with one set of simple / moderate /
              luxury per-head prices. Those prices apply to <strong>every</strong> event type
              you tick here. Add <strong>another service</strong> as another row, then publish
              all at once from the batch form (or publish one line at a time from edit).
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {EVENT_MULTI_PRESETS.map((o) => (
          <label
            key={o.key}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-espresso-200/15 bg-white px-3 py-2 text-sm text-espresso-200 shadow-sm hover:border-gold-400/40"
          >
            <input
              type="checkbox"
              className="rounded border-espresso-200/30"
              checked={selectedPresetKeys.includes(o.key)}
              onChange={() => toggle(o.key)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <TagBlock
        label="More event types (custom — press Enter)"
        placeholder="e.g. Mehndi, Engagement"
        tags={customTags}
        onChange={onChangeCustomTags}
      />
    </div>
  );
}
