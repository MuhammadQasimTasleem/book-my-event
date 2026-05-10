import PageHero from "@/components/page-hero";
import PackageBuilder from "./package-builder";

export const metadata = { title: "Package Builder — Book My Event" };

type Props = { searchParams: Promise<{ group?: string }> };

export default async function PackageBuilderPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="design your event"
        title="Build your package, see your budget — live"
        subtitle="Venues, catering, photo, décor, entertainment, beauty, transport, fashion, corporate, religious, and kids — tier, date, venue, guests, and notes sync to your live API estimate."
        crumbs={[{ label: "Package Builder" }]}
        backgroundImage="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"
      />
      <PackageBuilder initialGroupId={sp.group} />
    </>
  );
}