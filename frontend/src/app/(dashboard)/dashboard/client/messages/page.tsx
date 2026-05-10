import { Suspense } from "react";
import MessagesContent from "./messages-content";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
