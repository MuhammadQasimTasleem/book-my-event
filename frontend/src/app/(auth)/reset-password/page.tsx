import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        </section>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
