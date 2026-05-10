import Link from "next/link";
import {
  CalendarHeart,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const footerLinks = [
  {
    title: "Explore",
    items: [
      { href: "/organizers", label: "Organizers" },
      { href: "/package-builder", label: "Package Builder" },
      { href: "/about", label: "About Us" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/login", label: "Sign In" },
      { href: "/register", label: "Create Account" },
      { href: "/dashboard/client", label: "Client Dashboard" },
      { href: "/dashboard/organizer", label: "Organizer Dashboard" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/contact", label: "Contact" },
      { href: "/contact", label: "Help Center" },
      { href: "/contact", label: "Report an Issue" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 bg-espresso-200 text-cream-100">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-300 text-espresso-200">
              <CalendarHeart size={18} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-serif text-2xl tracking-tight text-cream-50">
                Book My Event
              </span>
              <span className="font-script text-base text-gold-300">
                curated celebrations
              </span>
            </span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-7 text-cream-100/70">
            A curated marketplace connecting clients with verified event
            organizers — design your day, customize the package, and let us
            handle the rest.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-9 w-9 place-items-center rounded-full border border-cream-100/15 text-cream-100/70 transition hover:border-gold-300 hover:text-gold-300"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {footerLinks.map((group) => (
          <div key={group.title}>
            <h4 className="mb-5 font-serif text-xl text-cream-50">
              {group.title}
            </h4>
            <ul className="space-y-3 text-sm text-cream-100/70">
              {group.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="transition hover:text-gold-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream-100/10">
        <div className="container-x flex flex-col items-start gap-3 py-5 text-xs text-cream-100/60 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Book My Event. Crafted for the
            unforgettable.
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <Mail size={13} className="text-gold-300" />{" "}
              hello@bookmyevent.app
            </span>
            <span className="flex items-center gap-2">
              <Phone size={13} className="text-gold-300" /> +92 300 1234567
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={13} className="text-gold-300" /> Lahore, Pakistan
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
