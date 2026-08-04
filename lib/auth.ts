import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export type SessionData = {
  pinVerified?: boolean;
  activeUserId?: string;
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

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Guard for routes that only need the shared PIN entered (the profile picker
 * itself, and creating/listing/selecting profiles) — not a specific profile
 * chosen yet. */
export async function requirePinVerified(): Promise<void> {
  const session = await getSession();
  if (!session.pinVerified) {
    throw new UnauthorizedError();
  }
}

/** Guard for API route handlers that act on behalf of a specific person (draft
 * generation, sending, edits) — requires both the PIN and an active profile.
 * Name is looked up fresh from the DB rather than cached in the session cookie. */
export async function requireActiveUser(): Promise<{ userId: string; userName: string }> {
  const session = await getSession();
  if (!session.pinVerified || !session.activeUserId) {
    throw new UnauthorizedError();
  }
  const user = await prisma.user.findUnique({ where: { id: session.activeUserId } });
  if (!user) {
    throw new UnauthorizedError();
  }
  return { userId: user.id, userName: user.name };
}
