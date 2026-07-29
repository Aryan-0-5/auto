import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export type SessionData = {
  userId?: string;
  userName?: string;
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

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Guard for API route handlers: throws UnauthorizedError if no session, otherwise returns the session's user id/name. */
export async function requireUser(): Promise<{ userId: string; userName: string }> {
  const session = await getSession();
  if (!session.userId || !session.userName) {
    throw new UnauthorizedError();
  }
  return { userId: session.userId, userName: session.userName };
}
