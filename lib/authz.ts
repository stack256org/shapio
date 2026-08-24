import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_ROLE } from "@/config/platform";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/signin");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  const [freshUser] = await db
    .select({
      banned: user.banned,
      email: user.email,
      id: user.id,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // Orbit Admin is invisible to non-Orbit-Admins: a signed-in user who isn't an
  // Orbit Admin gets a standard not-found page rather than a redirect, so the
  // area's existence is never revealed (PLATFORM.md §9, Feature 13). Signed-out
  // users are sent to sign-in earlier by requireSession / middleware.
  if (!freshUser || freshUser.banned || freshUser.role !== ADMIN_ROLE) {
    notFound();
  }

  return {
    ...session,
    user: {
      ...session.user,
      banned: freshUser.banned,
      email: freshUser.email,
      role: freshUser.role,
    },
  };
}
