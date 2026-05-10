"use client";

export default function OrganizerDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="section">
      <div className="container-x py-20 text-center">
        <h1 className="font-serif text-2xl text-espresso-200">
          Something went wrong
        </h1>
        <button type="button" className="btn-primary mt-6" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
