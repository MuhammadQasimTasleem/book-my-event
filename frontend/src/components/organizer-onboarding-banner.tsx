import Link from "next/link";
import { CheckCircle2, Circle, ClipboardList, Send, UserCircle } from "lucide-react";
import type { OrganizerProfileApi } from "@/lib/api/types";

type Props = {
  profile: OrganizerProfileApi | null;
  hasServices: boolean;
};

function StepRow({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-espresso-200/25" aria-hidden />
      )}
      <div className="text-sm text-espresso-200">{children}</div>
    </li>
  );
}

export function OrganizerOnboardingBanner({ profile, hasServices }: Props) {
  const status = profile?.approval_status ?? "draft";
  if (status === "approved") return null;

  const hasProfile = Boolean(profile?.id && profile.company_name?.trim());
  const descOk = (profile?.description ?? "").trim().length >= 20;

  if (status === "pending") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-cream-50 p-6 shadow-soft">
        <p className="font-serif text-xl text-espresso-200">Awaiting admin review</p>
        <p className="mt-2 max-w-2xl text-sm text-espresso-200/85">
          Thank you — your profile and services are in the queue. A staff member will review your
          public profile and listings before you appear on the marketplace. We&apos;ll email you when
          there&apos;s an update.
        </p>
        <Link
          href="/dashboard/organizer/profile"
          className="mt-4 inline-flex text-sm font-medium text-gold-600 hover:underline"
        >
          View or edit your profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold-300/40 bg-gradient-to-br from-cream-50 via-white to-gold-300/10 p-6 shadow-soft">
      <p className="font-serif text-xl text-espresso-200">Finish setting up your organizer account</p>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Your login email must be verified before you can sign in. You are{" "}
        <strong className="font-medium text-espresso-200">not a verified marketplace organizer</strong>{" "}
        until you complete your business profile, publish at least one service, submit for staff
        review, and an administrator approves your profile after visiting it in the admin console.
      </p>
      <ol className="mt-5 space-y-3">
        <StepRow done={hasProfile}>
          <span className="font-medium text-espresso-200">Business profile</span>
          <p className="mt-0.5 text-muted">
            Company name and about text (at least 20 characters){" "}
            {descOk ? "(done)" : "(required before you can submit for approval)"}.
          </p>
          <Link
            href="/dashboard/organizer/profile"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:underline"
          >
            <UserCircle size={14} /> Open profile &amp; portfolio
          </Link>
        </StepRow>
        <StepRow done={hasServices}>
          <span className="font-medium text-espresso-200">List your services</span>
          <p className="mt-0.5 text-muted">At least one published listing is required before submission.</p>
          <Link
            href="/dashboard/organizer/services"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:underline"
          >
            <ClipboardList size={14} /> Add services
          </Link>
        </StepRow>
        <StepRow done={false}>
          <span className="font-medium text-espresso-200">Submit for approval</span>
          <p className="mt-0.5 text-muted">
            When the steps above are complete, use{" "}
            <strong className="text-espresso-200/90">Submit for staff review</strong> on your profile
            page. An admin will open your profile, check your services, then approve or request changes.
          </p>
          <Link
            href="/dashboard/organizer/profile"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:underline"
          >
            <Send size={14} /> Go to profile to submit
          </Link>
        </StepRow>
      </ol>
      {status === "rejected" && profile?.approval_notes?.trim() && (
        <p className="mt-4 rounded-lg border border-rose-200/80 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span className="font-medium">Previous note from staff: </span>
          {profile.approval_notes}
        </p>
      )}
    </div>
  );
}
