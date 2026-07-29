import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-handler";
import { updateTemplateSchema } from "@/lib/validation";
import { deriveIsHtmlFromTiptapDoc } from "@/lib/render-email";

export const GET = withAuth(async () => {
  const template = await prisma.template.findFirst({ where: { name: "default" } });
  if (!template) {
    return NextResponse.json({ error: "Default template not found — has the app been seeded?" }, { status: 404 });
  }
  return NextResponse.json({ template });
});

export const PUT = withAuth(async (user, request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template payload" }, { status: 400 });
  }

  const { openingLine, termsBlock, closingSignature } = parsed.data;
  const isHtml =
    deriveIsHtmlFromTiptapDoc(openingLine.json) ||
    deriveIsHtmlFromTiptapDoc(termsBlock.json) ||
    deriveIsHtmlFromTiptapDoc(closingSignature.json);

  const existing = await prisma.template.findFirst({ where: { name: "default" } });
  const template = existing
    ? await prisma.template.update({
        where: { id: existing.id },
        data: {
          openingLineHtml: openingLine.html,
          termsBlockHtml: termsBlock.html,
          closingSignatureHtml: closingSignature.html,
          isHtml,
          updatedByUserId: user.userId,
        },
      })
    : await prisma.template.create({
        data: {
          name: "default",
          openingLineHtml: openingLine.html,
          termsBlockHtml: termsBlock.html,
          closingSignatureHtml: closingSignature.html,
          isHtml,
          updatedByUserId: user.userId,
        },
      });

  return NextResponse.json({ template });
});
