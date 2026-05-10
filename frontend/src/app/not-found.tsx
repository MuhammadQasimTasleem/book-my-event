import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="relative isolate overflow-hidden bg-cream-50 py-32 text-center">
      <div className="container-x">
        <p className="font-script text-3xl text-gold-300">oh dear</p>
        <h1 className="mt-2 font-serif text-7xl text-espresso-200 sm:text-8xl">
          404
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-8 text-muted">
          We can&apos;t find the page you&apos;re looking for. Perhaps it was
          part of an event that&apos;s already concluded.
        </p>
        <Link href="/" className="btn-primary mt-8 inline-flex">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </section>
  );
}
