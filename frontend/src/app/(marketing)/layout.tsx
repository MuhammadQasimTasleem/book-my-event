import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

export default function MarketingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
    </>
  );
}
