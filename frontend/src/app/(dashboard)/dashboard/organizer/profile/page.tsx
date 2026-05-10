"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { ExternalLink, Star, Trash2, Upload } from "lucide-react";
import {
  createOrganizerProfile,
  deleteOrganizerEventPhoto,
  fetchOrganizers,
  patchOrganizerProfile,
  patchUserMe,
  submitOrganizerForApproval,
  uploadOrganizerEventPhoto,
} from "@/lib/api/client";
import { API_ORIGIN } from "@/lib/config";
import type { OrganizerProfileApi } from "@/lib/api/types";
import { useAuth } from "@/components/providers";

const MAX_EVENT_PHOTOS = 30;
/** Must match backend MIN_ORGANIZER_DESCRIPTION_LEN */
const MIN_ABOUT_LENGTH = 20;

function photoSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = API_ORIGIN.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function OrganizerProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<OrganizerProfileApi | null>(null);
  const [company_name, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const d = await fetchOrganizers({ user: String(user.id) }, { auth: true });
    const p = d.results[0] ?? null;
    setProfile(p);
    if (p) {
      setCompanyName(p.company_name);
      setDescription(p.description ?? "");
    } else {
      setCompanyName("");
      setDescription("");
    }
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPhone(user.phone_number ?? "");
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/organizer/profile");
      return;
    }
    if (user.role !== "organizer") {
      router.replace("/dashboard");
      return;
    }
    setReady(false);
    void load()
      .catch(() => setErr("Could not load your organizer profile."))
      .finally(() => setReady(true));
  }, [user, authLoading, router, load]);

  const saveAccount = async () => {
    setMsg(null);
    setErr(null);
    setSavingAccount(true);
    try {
      await patchUserMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      });
      await refreshUser();
      setMsg("Account details saved.");
    } catch {
      setErr("Could not save account details.");
    } finally {
      setSavingAccount(false);
    }
  };

  /** One flow for everyone: creates draft listing first time, updates after. */
  const saveBusinessProfile = async () => {
    setMsg(null);
    setErr(null);
    if (!company_name.trim()) {
      setErr("Public business title (company name) is required.");
      return;
    }
    setSaving(true);
    try {
      if (!profile) {
        const p = await createOrganizerProfile({
          company_name: company_name.trim(),
          description: description.trim(),
        });
        setProfile(p);
        setMsg(
          "Business profile created. Add services, portfolio photos, then submit for staff review when ready."
        );
      } else {
        const p = await patchOrganizerProfile(profile.id, {
          company_name: company_name.trim(),
          description: description.trim(),
        });
        setProfile(p);
        setMsg("Business profile updated.");
      }
      await load();
    } catch {
      setErr(
        profile
          ? "Save failed. Try again."
          : "Could not create profile. Refresh if you already have one."
      );
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    setMsg(null);
    setErr(null);
    setUploadingPhoto(true);
    try {
      await uploadOrganizerEventPhoto({ image: file, caption: photoCaption });
      setPhotoCaption("");
      await load();
      setMsg("Photo uploaded.");
    } catch (ex: unknown) {
      const d =
        ex && typeof ex === "object" && "detail" in ex
          ? (ex as { detail: unknown }).detail
          : null;
      const text =
        typeof d === "string"
          ? d
          : d && typeof d === "object" && "detail" in d
            ? String((d as { detail: unknown }).detail)
            : "Upload failed. Try a smaller image or different format.";
      setErr(text);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (id: number) => {
    setMsg(null);
    setErr(null);
    setDeletingId(id);
    try {
      await deleteOrganizerEventPhoto(id);
      await load();
      setMsg("Photo removed.");
    } catch {
      setErr("Could not delete that photo.");
    } finally {
      setDeletingId(null);
    }
  };

  const submitForApproval = async () => {
    if (!profile) return;
    setMsg(null);
    setErr(null);
    setSubmittingApproval(true);
    try {
      const p = await submitOrganizerForApproval();
      setProfile(p);
      setMsg(
        "Submitted for review. Staff were notified — check your dashboard notifications (admin) or email."
      );
    } catch (ex: unknown) {
      const d =
        ex && typeof ex === "object" && "detail" in ex
          ? (ex as { detail: unknown }).detail
          : null;
      setErr(typeof d === "string" ? d : "Could not submit for approval.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  const aboutLen = description.trim().length;
  const aboutOk = aboutLen >= MIN_ABOUT_LENGTH;
  const canSubmitForApproval =
    !!profile &&
    (profile.approval_status === "draft" || profile.approval_status === "rejected") &&
    company_name.trim().length > 0 &&
    aboutOk &&
    (profile.services_count ?? 0) > 0;

  const isApprovedListing = profile?.approval_status === "approved";
  const verificationLabel = !profile
    ? "Not created yet"
    : profile.approval_status;

  if (authLoading || !user || user.role !== "organizer") {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  if (!ready) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const displayName =
    profile?.display_name?.trim() ||
    `${firstName} ${lastName}`.trim() ||
    "—";
  const contactEmail = profile?.contact_email ?? user.email ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard/organizer"
          className="text-sm text-gold-400 hover:underline"
        >
          ← Organizer overview
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-espresso-200">
          Your organizer profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your <strong className="font-medium text-espresso-200">public business</strong>{" "}
          title and story live here (company name, about text, portfolio of past work).
          Individual service listings use event &amp; service types and tiered prices on
          the Services page. Contact email is your sign-in email. This layout is the same
          for every organizer — only your status and data change.
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
        <h2 className="font-serif text-xl text-espresso-200">Account &amp; contact</h2>
        <p className="text-sm text-muted">
          Shown as your display name on listings and messages.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            First name
            <input
              className="input normal-case"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
            Last name
            <input
              className="input normal-case"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Phone (Pakistan format)
          <input
            className="input normal-case"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92…"
          />
        </label>
        <button
          type="button"
          disabled={savingAccount}
          className="btn-ghost border border-espresso-200/20"
          onClick={() => void saveAccount()}
        >
          {savingAccount ? "Saving…" : "Save account details"}
        </button>
      </div>

      {/* Single main card — same structure for new and existing organizers */}
      <div className="space-y-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-espresso-200/10 pb-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              Verification
            </p>
            <p className="mt-1 capitalize text-espresso-200">
              {verificationLabel}
              {!profile && (
                <span className="ml-2 text-sm font-normal text-muted">
                  — save your business details below to create your draft listing.
                </span>
              )}
              {profile?.approval_status === "pending" && (
                <span className="ml-2 text-sm font-normal text-muted">
                  — staff are reviewing your profile and services.
                </span>
              )}
            </p>
            {profile?.approval_notes ? (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-espresso-200">Note: </span>
                {profile.approval_notes}
              </p>
            ) : null}
          </div>
          {isApprovedListing && profile ? (
            <Link
              href={`/organizers/${profile.user}`}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-gold-400 hover:underline"
            >
              Public page <ExternalLink size={12} />
            </Link>
          ) : (
            <span className="text-xs text-muted">
              Public page unlocks after approval
            </span>
          )}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Display name
            </dt>
            <dd className="mt-0.5 text-espresso-200">{displayName}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Contact email
            </dt>
            <dd className="mt-0.5 text-espresso-200">{contactEmail}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted">
              <Star size={12} className="text-gold-400" /> Avg. rating
            </dt>
            <dd className="mt-0.5 text-espresso-200">
              {profile ? `${(profile.average_rating ?? 0).toFixed(1)} / 5` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Services listed
            </dt>
            <dd className="mt-0.5 text-espresso-200">
              {profile ? (profile.services_count ?? 0) : "—"}
            </dd>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/dashboard/organizer/services"
                className="text-xs font-medium text-gold-500 hover:underline"
              >
                Manage services
              </Link>
              {profile ? (
                <button
                  type="button"
                  className="text-xs font-medium text-gold-500 hover:underline"
                  onClick={() =>
                    void load().catch(() => setErr("Could not refresh profile."))
                  }
                >
                  Refresh counts
                </button>
              ) : null}
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Approved at
            </dt>
            <dd className="mt-0.5 text-espresso-200">
              {profile?.approved_at
                ? new Date(profile.approved_at).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          Public business title (company / brand name)
          <input
            className="input normal-case"
            value={company_name}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your studio or brand name"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
          About your business (shown on your public organizer page)
          <textarea
            className="input min-h-[140px] normal-case"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you offer, cities, specialties…"
          />
        </label>
        <p className="text-xs text-muted">
          About section must be at least <strong className="text-espresso-200">{MIN_ABOUT_LENGTH}</strong>{" "}
          characters before you can submit for approval ({aboutLen}/{MIN_ABOUT_LENGTH}).
        </p>

        <button
          type="button"
          disabled={saving}
          className="btn-primary"
          onClick={() => void saveBusinessProfile()}
        >
          {saving
            ? "Saving…"
            : profile
              ? "Save profile"
              : "Create business profile"}
        </button>

        {profile &&
          (profile.approval_status === "draft" ||
            profile.approval_status === "rejected") && (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4">
              <p className="text-sm text-espresso-200">
                When your business details, about text ({MIN_ABOUT_LENGTH}+ characters), and at
                least one service are ready, submit for staff review. Admins can only approve
                after your profile is complete.
              </p>
              <button
                type="button"
                disabled={!canSubmitForApproval || submittingApproval}
                className="btn-primary mt-3"
                onClick={() => void submitForApproval()}
              >
                {submittingApproval ? "Submitting…" : "Submit for approval"}
              </button>
              {!canSubmitForApproval && (
                <ul className="mt-2 list-inside list-disc text-xs text-muted">
                  {!company_name.trim() ? (
                    <li>Add a public business title.</li>
                  ) : null}
                  {!aboutOk ? (
                    <li>
                      Expand your &quot;About&quot; section to at least {MIN_ABOUT_LENGTH}{" "}
                      characters.
                    </li>
                  ) : null}
                  {(profile.services_count ?? 0) < 1 ? (
                    <li>
                      Add at least one service under{" "}
                      <Link href="/dashboard/organizer/services" className="text-gold-500">
                        My Services
                      </Link>
                      .
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          )}

        <div className="border-t border-espresso-200/10 pt-6">
          <h2 className="font-serif text-xl text-espresso-200">
            Portfolio — past events &amp; work
          </h2>
          <p className="mt-1 text-sm text-muted">
            Photos of events you&apos;ve done appear on your public profile (up to{" "}
            {MAX_EVENT_PHOTOS} images). Uploads are available once your business profile exists.
          </p>

          {!profile ? (
            <p className="mt-4 rounded-lg border border-espresso-200/15 bg-cream-50/80 px-3 py-2 text-sm text-muted">
              Save your business profile above first — then you can add portfolio images here
              (same place every organizer uses).
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted">
                {(profile.event_photos?.length ?? 0)} / {MAX_EVENT_PHOTOS} uploaded
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
                  Caption (optional)
                  <input
                    className="input normal-case"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="e.g. Wedding — Lahore, 2025"
                    maxLength={500}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-espresso-200/20 bg-cream-100/50 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-espresso-200 hover:bg-cream-100">
                  <Upload size={16} />
                  {uploadingPhoto ? "Uploading…" : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={
                      uploadingPhoto ||
                      (profile.event_photos?.length ?? 0) >= MAX_EVENT_PHOTOS
                    }
                    onChange={(e) => void onPickPhoto(e)}
                  />
                </label>
              </div>

              {(profile.event_photos?.length ?? 0) > 0 ? (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {(profile.event_photos ?? []).map((ph) => (
                    <li
                      key={ph.id}
                      className="overflow-hidden rounded-xl border border-espresso-200/10 bg-cream-100/30"
                    >
                      <div className="relative aspect-[4/3] w-full">
                        {ph.image ? (
                          <Image
                            src={photoSrc(ph.image)}
                            alt={ph.caption || "Event photo"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        ) : null}
                      </div>
                      {ph.caption ? (
                        <p className="px-3 py-2 text-sm text-espresso-200">
                          {ph.caption}
                        </p>
                      ) : null}
                      <div className="flex justify-end border-t border-espresso-200/10 px-2 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          disabled={deletingId === ph.id}
                          onClick={() => void removePhoto(ph.id)}
                        >
                          <Trash2 size={14} />
                          {deletingId === ph.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No portfolio photos yet. Upload one to showcase past events.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
