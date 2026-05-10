import { Suspense } from "react";
import MessagesContent from "../../client/messages/messages-content";

export default function OrganizerMessagesPage() {
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
