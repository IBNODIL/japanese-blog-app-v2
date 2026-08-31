import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "TEACHER";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  // Better Auth exposes additionalFields on user, but fetch from DB as fallback
  const role = (session.user as Record<string, unknown>).role as string | undefined;
  if (role) {
    return { ...session.user, role: role as "SUPER_ADMIN" | "ADMIN" | "TEACHER" } as SessionUser;
  }

  // Fallback: query DB for the role
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    role: dbUser?.role ?? "TEACHER",
  } as SessionUser;
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "SUPER_ADMIN";
}
