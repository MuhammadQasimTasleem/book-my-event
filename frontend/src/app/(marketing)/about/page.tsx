import Image from "next/image";
import Link from "next/link";
import { Award, HandHeart, Leaf, ShieldCheck, Sparkles, Star } from "lucide-react";
import PageHero from "@/components/page-hero";
import SectionHeading from "@/components/section-heading";
import { team, stats } from "@/lib/data";

export const metadata = { title: "About — Book My Event" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="our story"
        title="The art of hosting, made effortless"
        subtitle="A boutique platform connecting clients with verified event organizers. We believe planning should feel as joyful as the event itself."
        crumbs={[{ label: "About" }]}
      />

      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-soft">
              <Image
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80"
                alt="Tablescape"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-[4/5] translate-y-10 overflow-hidden rounded-3xl shadow-soft">
              <Image
                src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80"
                alt="Event lighting"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <SectionHeading
              align="left"
              eyebrow="who we are"
              title="A modern marketplace for unforgettable celebrations"
              subtitle="From intimate dinners to 600-guest weddings, our verified network of organizers brings craftsmanship and care to every detail. We curate. We coordinate. You celebrate."
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  title: "Verified Network",
                  text: "Every organizer is vetted by our admin team.",
                },
                {
                  icon: HandHeart,
                  title: "Real-time Chat",
                  text: "Stay in sync with your organizer at every step.",
                },
                {
                  icon: Leaf,
                  title: "Transparent Budget",
                  text: "Know your costs. No surprises, ever.",
                },
                {
                  icon: Award,
                  title: "Top-rated Vendors",
                  text: "An average rating of 4.9/5 across the platform.",
                },
              ].map((b) => (
                <div
                  key={b.title}
                  className="flex gap-3 rounded-xl border border-espresso-200/10 bg-white p-5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream-100 text-gold-400">
                    <b.icon size={18} />
                  </span>
                  <div>
                    <h4 className="font-serif text-lg text-espresso-200">
                      {b.title}
                    </h4>
                    <p className="text-sm leading-6 text-muted">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-espresso-200 py-20 text-cream-50">
        <div className="absolute inset-0 -z-10 bg-hero-grain opacity-90" />
        <div className="container-x grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-serif text-5xl text-gold-300">{s.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-cream-100/70">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <SectionHeading
            eyebrow="our team"
            title="Hosts, designers, and dreamers"
            subtitle="The small, dedicated team behind every successful celebration."
          />
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div
                key={m.name}
                className="group overflow-hidden rounded-2xl bg-white shadow-soft"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={m.image}
                    alt={m.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 text-center">
                  <h4 className="font-serif text-xl text-espresso-200">
                    {m.name}
                  </h4>
                  <p className="text-xs uppercase tracking-[0.18em] text-gold-400">
                    {m.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-cream-100/40">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="our values"
            title="Crafted with intention"
            subtitle="A few promises we don't compromise on, no matter the size of the event."
          />
          <ul className="space-y-5">
            {[
              {
                icon: Sparkles,
                title: "Beauty in every detail",
                text: "From hand-tied bouquets to plated tasting menus.",
              },
              {
                icon: Star,
                title: "Hospitality first",
                text: "Service that puts your guests at the heart.",
              },
              {
                icon: ShieldCheck,
                title: "Trust by design",
                text: "Verified organizers, secure data, transparent budgets.",
              },
            ].map((v) => (
              <li
                key={v.title}
                className="flex items-start gap-4 rounded-2xl border border-espresso-200/10 bg-white p-6"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-300/15 text-gold-400">
                  <v.icon size={18} />
                </span>
                <div>
                  <h4 className="font-serif text-lg text-espresso-200">
                    {v.title}
                  </h4>
                  <p className="mt-1 text-sm leading-7 text-muted">{v.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container-x rounded-3xl bg-cream-100 p-10 text-center sm:p-14">
          <h3 className="font-serif text-3xl text-espresso-200 sm:text-4xl">
            Plan with us — make memories that linger.
          </h3>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/package-builder" className="btn-primary">
              Build your package
            </Link>
            <Link href="/contact" className="btn-ghost">
              Talk to a planner
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
