import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import HomePage from "@/app/page";
import AboutPage from "@/app/about/page";
import ContactPage from "@/app/contact/page";
import { authOptions } from "@/lib/auth";
import { ImmersiveEditorOverlay } from "@/components/editor/immersive-editor-overlay";

type EditorSlug = "home" | "about" | "contact";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ImmersiveEditorPage({ params }: Props) {
  const { slug } = await params;
  const safeSlug = slug.toLowerCase().trim();
  if (!["home", "about", "contact"].includes(safeSlug)) notFound();

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/editor/${safeSlug}`)}`);
  }

  const editorSlug = safeSlug as EditorSlug;
  return (
    <>
      {editorSlug === "home" ? <HomePage /> : null}
      {editorSlug === "about" ? <AboutPage /> : null}
      {editorSlug === "contact" ? <ContactPage /> : null}
      <ImmersiveEditorOverlay slug={editorSlug} />
    </>
  );
}
