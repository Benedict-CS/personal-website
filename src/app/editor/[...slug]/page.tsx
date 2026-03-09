import { notFound } from "next/navigation";
import { ImmersiveEditor } from "@/components/editor/immersive-editor";
import { resolveEditorTarget } from "@/lib/editor-route";

type Props = { params: Promise<{ slug: string[] }> };

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: Props) {
  const { slug } = await params;
  const target = resolveEditorTarget(slug);
  if (!target) notFound();
  return <ImmersiveEditor target={target} />;
}
