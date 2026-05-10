import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  MessageCircle,
  Search,
  Sparkle,
  Star,
  Users,
} from "lucide-react";
import * as Icons from "lucide-react";
import {
  categoryGroupSummaries,
  testimonials,
  stats,
  eventShowcase,
  formatPKR,
} from "@/lib/data";
import { getServices } from "@/lib/api/server";
import { mapServiceApiToCard } from "@/lib/map-service";
import SectionHeading from "@/components/section-heading";
import ServiceCard from "@/components/service-card";

const heroImages = [
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80",
];

export default async function HomePage() {
  const apiList = await getServices({});
  const featured =
    apiList.length > 0 ? apiList.slice(0, 6).map(mapServiceApiToCard) : [];

  return (
    <>
      {/* INTRO + SEARCH (main headline lives in site header hero) */}
      <section className="relative isolate overflow-hidden bg-cream-50">
        <div className="absolute inset-0 -z-10 bg-hero-grain" />
        <div className="container-x grid items-center gap-12 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-6">
            <p className="max-w-xl text-base leading-8 text-muted">
              Search verified organizers by style and city, then open any profile to
              see services, ratings, and messaging. Use{" "}
              <strong className="font-medium text-espresso-200">Plan an event</strong>{" "}
              in the header when you&apos;re ready to estimate a multi-service package.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/organizers" className="btn-primary">
                Browse organizers
                <ArrowRight size={16} />
              </Link>
              <Link href="/package-builder" className="btn-ghost">
                Plan an event (estimator)
              </Link>
            </div>

            {/* Search bar */}
            <div className="mt-10 rounded-2xl border border-espresso-200/10 bg-white/80 p-2 shadow-soft backdrop-blur">
              <form
                action="/organizers"
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <label className="flex items-center gap-2 rounded-xl px-4 py-3">
                  <Search size={16} className="text-gold-300" />
                  <input
                    name="q"
                    placeholder="What are you planning?"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl px-4 py-3 sm:border-l sm:border-espresso-200/10">
                  <Icons.MapPin size={16} className="text-gold-300" />
                  <input
                    name="city"
                    placeholder="City"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </label>
                <button type="submit" className="btn-gold">
                  Search
                </button>
              </form>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-gold-300" /> Verified
                organizers
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-gold-300" /> Live budget
                tracking
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative h-72 overflow-hidden rounded-3xl shadow-soft">
                  <Image
                    src={heroImages[0]}
                    alt="Floral tablescape"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    loading="eager"
                  />
                </div>
                <div className="relative h-44 overflow-hidden rounded-3xl shadow-soft">
                  <Image
                    src={heroImages[1]}
                    alt="Ballroom"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-10">
                <div className="relative h-44 overflow-hidden rounded-3xl shadow-soft">
                  <Image
                    src={heroImages[2]}
                    alt="Outdoor wedding"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="card animate-floaty">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-300/15 text-gold-400">
                      <Sparkle size={16} />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        Today&apos;s Tip
                      </p>
                      <p className="font-serif text-lg text-espresso-200">
                        Lock your venue first
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-muted">
                    A confirmed venue unlocks better catering & decor pricing.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-espresso-200/10 bg-white px-5 py-4 shadow-soft md:block">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="h-9 w-9 rounded-full border-2 border-white bg-cream-200"
                      style={{
                        backgroundImage: `url(https://images.unsplash.com/photo-15${i}9${i}74000-7168${i}b8af9bc3?auto=format&fit=crop&w=200&q=60)`,
                        backgroundSize: "cover",
                      }}
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gold-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className="fill-gold-300 text-gold-300"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    Loved by 1,800+ couples & corporates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section bg-cream-100/40">
        <div className="container-x">
          <SectionHeading
            eyebrow="our services"
            title="Every detail, beautifully covered"
            subtitle="From the first toast to the final dance — explore curated categories of vendors, all verified and rated by real clients."
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categoryGroupSummaries.map((cat) => {
              const Icon =
                (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[cat.icon] || Sparkle;
              const organizersHref = `/organizers?q=${encodeURIComponent(cat.name)}`;
              return (
                <Link
                  key={cat.id}
                  href={organizersHref}
                  className="group relative overflow-hidden rounded-2xl border border-espresso-200/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-gold"
                >
                  <div className="relative aspect-[16/10] w-full">
                    <Image
                      src={cat.heroImage}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  </div>
                  <div className="relative p-6 pt-4">
                    <span className="inline-grid h-12 w-12 place-items-center rounded-xl bg-cream-100 text-gold-400 -mt-10 border border-white shadow-soft">
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-4 font-serif text-2xl text-espresso-200">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {cat.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gold-400">
                      Find organizers <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT STRIP */}
      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-soft">
              <Image
                src="https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=1200&q=80"
                alt="Event setup"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
            <div className="absolute -right-6 -bottom-6 hidden w-64 rounded-2xl border border-espresso-200/10 bg-white p-5 shadow-soft md:block">
              <p className="font-script text-2xl text-gold-300">since 2019</p>
              <p className="mt-1 font-serif text-2xl text-espresso-200">
                Crafting unforgettable memories
              </p>
              <p className="mt-2 text-xs leading-6 text-muted">
                A boutique platform born from a love of detail and a refusal to
                settle for ordinary.
              </p>
            </div>
          </div>

          <div>
            <SectionHeading
              align="left"
              eyebrow="about us"
              title="A little story behind Book My Event"
              subtitle="We started with one belief — that planning should feel as joyful as the event itself. Today, we connect thousands of clients with verified organizers who care about every flower, every flame, and every frame."
            />
            <ul className="mt-8 space-y-5">
              {[
                {
                  icon: Users,
                  title: "Verified Organizer Network",
                  text: "Every organizer is reviewed and approved by our admin team.",
                },
                {
                  icon: Coins,
                  title: "Transparent Budgeting",
                  text: "See your full cost breakdown update live as you customize.",
                },
                {
                  icon: MessageCircle,
                  title: "Real-time Communication",
                  text: "Chat with your organizer the moment your booking is confirmed.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-300/15 text-gold-400">
                    <item.icon size={18} />
                  </span>
                  <div>
                    <h4 className="font-serif text-lg text-espresso-200">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/about" className="btn-primary">
                Read our story
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SIGNATURE SERVICES */}
      <section className="section bg-cream-100/40">
        <div className="container-x">
          <SectionHeading
            eyebrow="signature services"
            title="Loved by clients across Pakistan"
            subtitle="A handpicked selection of live listings from verified organizers. Each card opens that organizer’s profile (services, ratings, and message)."
          />
          <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {featured.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-espresso-200/25 bg-white/60 px-6 py-14 text-center shadow-soft">
                <p className="text-sm text-muted">
                  No public services yet. Organizers need an approved profile and at
                  least one listing — or the API isn’t reachable from this server
                  build.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/organizers" className="btn-primary">
                    Browse organizers
                  </Link>
                </div>
              </div>
            ) : (
              featured.map((s) => <ServiceCard key={s.id} service={s} />)
            )}
          </div>
          <div className="mt-12 text-center">
            <Link href="/organizers" className="btn-ghost">
              View all organizers & services <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container-x">
          <SectionHeading
            eyebrow="how it works"
            title="From idea to unforgettable, in four steps"
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-4">
            {[
              {
                icon: Search,
                title: "Discover",
                text: "Browse and filter verified organizers by category, city, price, and rating.",
              },
              {
                icon: ClipboardList,
                title: "Customize",
                text: "Shortlist organizers and services, then refine your plan with our package estimator.",
              },
              {
                icon: Coins,
                title: "Estimate",
                text: "Watch your budget update live with a clear cost breakdown.",
              },
              {
                icon: CalendarDays,
                title: "Book & Chat",
                text: "Submit a request, get confirmed, and chat with your organizer in real time.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-espresso-200/10 bg-white p-7 shadow-soft"
              >
                <span className="absolute -top-4 left-7 rounded-full bg-gold-300 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-espresso-200">
                  Step {i + 1}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-cream-100 text-gold-400">
                  <step.icon size={20} />
                </span>
                <h3 className="mt-5 font-serif text-xl text-espresso-200">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS / DARK STRIP */}
      <section className="relative isolate overflow-hidden bg-espresso-200 py-20 text-cream-50">
        <div className="absolute inset-0 -z-10 bg-hero-grain opacity-90" />
        <div className="container-x">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-serif text-5xl text-gold-300">
                  {s.value}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.22em] text-cream-100/70">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT EVENTS */}
      <section className="section">
        <div className="container-x">
          <SectionHeading
            eyebrow="recent events"
            title="Glimpses from our calendar"
            subtitle="A small selection of recent celebrations brought to life by organizers on our platform."
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {eventShowcase.map((ev) => (
              <article
                key={ev.id}
                className="group relative overflow-hidden rounded-2xl shadow-soft"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={ev.image}
                    alt={ev.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso-300/90 via-espresso-300/30 to-transparent" />
                </div>
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-cream-50/95 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-espresso-200">
                  {ev.type}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-cream-50">
                  <p className="text-xs uppercase tracking-[0.2em] text-gold-300">
                    {ev.date} • {ev.location}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl">{ev.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section bg-cream-100/40">
        <div className="container-x">
          <SectionHeading
            eyebrow="kind words"
            title="From our happiest clients"
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl border border-espresso-200/10 bg-white p-7 shadow-soft"
              >
                <div className="flex items-center gap-1 text-gold-300">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-gold-300 text-gold-300"
                    />
                  ))}
                </div>
                <blockquote className="mt-4 font-serif text-lg leading-8 text-espresso-200">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-espresso-200">{t.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">
                      {t.event}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-cream-100">
        <div className="container-x grid items-center gap-10 py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-gold-300">
              <span className="h-px w-10 bg-gold-300/60" />
              <span className="font-script text-2xl">your day, your way</span>
            </div>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-espresso-200 sm:text-5xl">
              Ready to plan something{" "}
              <span className="gold-text italic">unforgettable</span>?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted">
              Meet the right organizers first, then use the package planner for a
              transparent budget. We&apos;re here when you want a human to sanity-check
              the numbers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/organizers" className="btn-primary">
                Browse organizers <ArrowRight size={16} />
              </Link>
              <Link href="/package-builder" className="btn-ghost">
                Open estimator
              </Link>
              <Link href="/contact" className="btn-ghost">
                Talk to a planner
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="card">
              <h3 className="font-serif text-2xl text-espresso-200">
                Quick estimate
              </h3>
              <p className="mt-1 text-sm text-muted">
                A typical 200-guest celebration looks like:
              </p>
              <ul className="mt-5 divide-y divide-espresso-200/10">
                {[
                  ["Catering (200 guests × 2,500)", 500000],
                  ["Decor & florals", 180000],
                  ["Photography & film", 350000],
                  ["Live acoustic music", 120000],
                ].map(([label, val]) => (
                  <li
                    key={label as string}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted">{label}</span>
                    <span className="font-medium text-espresso-200">
                      {formatPKR(val as number)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-espresso-200 px-5 py-4 text-cream-50">
                <span className="text-xs uppercase tracking-[0.2em] text-cream-100/70">
                  Estimated total
                </span>
                <span className="font-serif text-2xl text-gold-300">
                  {formatPKR(1150000)}
                </span>
              </div>
              <Link
                href="/organizers"
                className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-gold-400 hover:text-espresso-200"
              >
                Find organizers for this mix <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
