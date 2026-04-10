import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCvProfileLines } from "@/lib/cv-profile-export";

export const dynamic = "force-dynamic";

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const about = await prisma.aboutConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!about) {
    return NextResponse.json({ error: "About profile is not configured yet." }, { status: 404 });
  }

  const lines = buildCvProfileLines({
    heroName: about.heroName,
    heroTagline: about.heroTagline,
    heroEmail: about.heroEmail,
    heroPhone: about.heroPhone,
    introText: about.introText,
    educationBlocks: parseJsonArray(about.educationBlocks),
    experienceBlocks: parseJsonArray(about.experienceBlocks),
    volunteerBlocks: parseJsonArray(about.volunteerBlocks),
    projectBlocks: parseJsonArray(about.projectBlocks),
    technicalSkills: parseJsonArray(about.technicalSkills),
    achievements: parseJsonArray(about.achievements),
  });

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const marginX = 48;
  const marginTop = 48;
  const lineHeight = 14;
  const contentBottom = 50;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = page.getHeight() - marginTop;

  for (const line of lines) {
    if (y <= contentBottom) {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getHeight() - marginTop;
    }
    const isSectionLine = /^[A-Z][A-Z\s]+$/.test(line.trim());
    page.drawText(line, {
      x: marginX,
      y,
      size: isSectionLine ? 12 : 10.5,
      font: isSectionLine ? boldFont : font,
      color: rgb(0.07, 0.07, 0.07),
      maxWidth: page.getWidth() - marginX * 2,
    });
    y -= lineHeight;
  }

  const bytes = await pdf.save();
  const filename = `cv-profile-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
