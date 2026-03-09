import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ImmersiveEditor } from "@/components/editor/immersive-editor";
import { resolveEditorTarget } from "@/lib/editor-route";
import { authOptions } from "@/lib/auth";

type Props = { params: Promise<{ slug: string[] }> };

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    const callbackPath = `/editor/${(slug ?? []).join("/")}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  const target = resolveEditorTarget(slug);
  if (!target) notFound();
  return <ImmersiveEditor target={target} />;
}
