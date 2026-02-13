export const metadata = { title: "Custom Pages" };

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
