import { Suspense } from "react";
import VerifyEmailInner from "./verify-email-inner";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container-x flex min-h-[50vh] items-center justify-center py-16">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        </section>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
