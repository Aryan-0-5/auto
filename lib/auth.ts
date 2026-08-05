import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export type SessionData = {
  pinVerified?: boolean;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const sessionOptions: SessionOptions = {
  password: requiredEnv("SESSION_SECRET"),
  cookieName: "mdc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** Checks the shared PIN against the singleton AppConfig row. */
export async function verifyPin(pin: string): Promise<boolean> {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config) return false;
  return bcrypt.compare(pin, config.pinHash);
}

/** Overwrites the stored PIN hash — used only by the /admin/reset-pin
 * break-glass path, gated by PIN_RESET_TOKEN rather than a session. */
export async function setPin(newPin: string): Promise<void> {
  const pinHash = await bcrypt.hash(newPin, 12);
  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: { pinHash },
    create: { id: "singleton", pinHash },
  });
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Guard for API route handlers. There's no profile picker anymore — every
 * action is attributed to the single seeded user (first by createdAt). The
 * User model itself is untouched so profile selection can come back later. */
export async function requireActiveUser(): Promise<{ userId: string; userName: string }> {
  const session = await getSession();
  if (!session.pinVerified) {
    throw new UnauthorizedError();
  }
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No seeded user found — has the app been seeded?");
  }
  return { userId: user.id, userName: user.name };
}
