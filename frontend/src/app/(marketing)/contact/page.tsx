import { Mail, MapPin, Phone } from "lucide-react";
import PageHero from "@/components/page-hero";

export const metadata = { title: "Contact — Book My Event" };

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="say hello"
        title="Let's plan something memorable"
        subtitle="Tell us a little about your event — we'll get back within 24 hours."
        crumbs={[{ label: "Contact" }]}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div className="space-y-6">
            {[
              {
                icon: Phone,
                title: "Call us",
                value: "+92 300 1234567",
                hint: "Mon–Sat • 9am–7pm",
              },
              {
                icon: Mail,
                title: "Email",
                value: "hello@bookmyevent.app",
                hint: "We reply within 24 hrs",
              },
              {
                icon: MapPin,
                title: "Studio",
                value: "Gulberg III, Lahore",
                hint: "By appointment only",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="flex items-start gap-4 rounded-2xl border border-espresso-200/10 bg-white p-6 shadow-soft"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-300/15 text-gold-400">
                  <c.icon size={18} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                    {c.title}
                  </p>
                  <p className="font-serif text-xl text-espresso-200">
                    {c.value}
                  </p>
                  <p className="mt-1 text-xs text-muted">{c.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <form className="rounded-3xl border border-espresso-200/10 bg-white p-8 shadow-soft">
            <h3 className="font-serif text-3xl text-espresso-200">
              Drop us a line
            </h3>
            <p className="mt-2 text-sm text-muted">
              Tell us about your celebration and we&apos;ll connect you with
              the right organizer.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">First name</label>
                <input className="input" placeholder="Ayesha" />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Khan" />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="ayesha@example.com"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+92 300 0000000" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Event type</label>
                <select className="input" defaultValue="">
                  <option value="" disabled>
                    Select an event type
                  </option>
                  <option>Wedding</option>
                  <option>Engagement</option>
                  <option>Corporate Gala</option>
                  <option>Birthday</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Tell us more</label>
                <textarea
                  rows={5}
                  className="input"
                  placeholder="Date, location, guest count, vision..."
                />
              </div>
            </div>

            <button className="btn-primary mt-6 w-full sm:w-auto">
              Send message
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
