import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for seeding`);
  return value;
}

async function seedUser(nameEnv: string, emailEnv: string, passwordEnv: string) {
  const name = nameEnv;
  const email = requireEnv(emailEnv);
  const password = requireEnv(passwordEnv);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { name, email, passwordHash },
  });
}

const DEFAULT_OPENING_LINE_HTML =
  "<p>Dear Sir,</p><p>We are pleased to offer our best prices as hereunder</p>";

const DEFAULT_TERMS_BLOCK_HTML =
  "<p>Ex-Stock/Ex-Godown</p><p>GST Extra @ 18%</p><p>Payment Immediately</p>";

const DEFAULT_CLOSING_SIGNATURE_HTML =
  "<p>Regards,</p><p>Rajesh</p><p>Sales Executive</p><p>MEHTA DOSHI AND COMPANY</p>";

async function seedDefaultTemplate() {
  const existing = await prisma.template.findFirst({ where: { name: "default" } });
  if (existing) return;

  await prisma.template.create({
    data: {
      name: "default",
      openingLineHtml: DEFAULT_OPENING_LINE_HTML,
      termsBlockHtml: DEFAULT_TERMS_BLOCK_HTML,
      closingSignatureHtml: DEFAULT_CLOSING_SIGNATURE_HTML,
      isHtml: false,
    },
  });
}

async function main() {
  await seedUser("Aryan", "SEED_ARYAN_EMAIL", "SEED_ARYAN_PASSWORD");
  await seedUser("Sameer", "SEED_SAMEER_EMAIL", "SEED_SAMEER_PASSWORD");
  await seedDefaultTemplate();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
