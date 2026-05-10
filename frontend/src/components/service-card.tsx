import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Service, formatPKR } from "@/lib/data";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/organizers/${service.organizerId}`}
      className="group block overflow-hidden rounded-2xl border border-espresso-200/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-gold"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* <img>: listing images come from organizers (any host); avoids next/image 500s. */}
        <img
          src={service.image}
          alt={service.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-cream-50/95 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-espresso-200">
            {service.category}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-espresso-200/85 px-3 py-1 text-xs text-cream-50">
          <Star size={12} className="fill-gold-300 text-gold-300" />
          <span>{service.rating}</span>
          <span className="text-cream-100/70">({service.reviews})</span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
          <MapPin size={12} className="text-gold-300" />
          {service.city}
          <span className="text-espresso-200/30">•</span>
          <span>{service.organizer}</span>
        </div>
        <h3 className="mt-2 font-serif text-xl text-espresso-200 group-hover:text-gold-400">
          {service.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {service.description}
        </p>
        {service.eventTypes && service.eventTypes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {service.eventTypes.slice(0, 6).map((a) => (
              <span
                key={a}
                className="rounded-full border border-gold-400/35 bg-cream-50/95 px-2 py-0.5 text-[10px] font-medium text-espresso-200"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}
        {service.includedAmenities && service.includedAmenities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {service.includedAmenities.slice(0, 5).map((a) => (
              <span
                key={a}
                className="rounded-full bg-cream-100/90 px-2 py-0.5 text-[10px] font-medium text-espresso-200/90"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {service.priceTo != null && service.priceTo > service.priceFrom
                ? "From – to"
                : "Starting from"}
            </p>
            <p className="font-serif text-2xl text-espresso-200">
              {service.priceTo != null && service.priceTo > service.priceFrom ? (
                <>
                  {formatPKR(service.priceFrom)} – {formatPKR(service.priceTo)}
                </>
              ) : (
                formatPKR(service.priceFrom)
              )}
              <span className="ml-1 text-xs font-sans text-muted">
                {service.unit}
              </span>
            </p>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold-400 group-hover:text-espresso-200">
            View organizer →
          </span>
        </div>
      </div>
    </Link>
  );
}
