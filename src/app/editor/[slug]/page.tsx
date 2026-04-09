import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import HomePage from "@/app/page";
import AboutPage from "@/app/about/page";
import ContactPage from "@/app/contact/page";
import DashboardPostsPage from "@/app/dashboard/posts/page";
import { authOptions } from "@/lib/auth";
import { ImmersiveEditorOverlay } from "@/components/editor/immersive-editor-overlay";

type EditorSlug = "home" | "about" | "blog" | "contact";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; sort?: string; order?: string; q?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ImmersiveEditorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const safeSlug = slug.toLowerCase().trim();
  if (!["home", "about", "blog", "contact"].includes(safeSlug)) notFound();

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/editor/${safeSlug}`)}`);
  }

  const editorSlug = safeSlug as EditorSlug;
  return (
    <>
      {editorSlug === "home" ? <HomePage /> : null}
      {editorSlug === "about" ? <AboutPage searchParams={Promise.resolve({})} /> : null}
      {editorSlug === "blog" ? (
        <div className="container mx-auto max-w-6xl px-4 py-8 pb-28">
          <DashboardPostsPage searchParams={searchParams} />
        </div>
      ) : null}
      {editorSlug === "contact" ? <ContactPage /> : null}
      <ImmersiveEditorOverlay slug={editorSlug} />
    </>
  );
}
