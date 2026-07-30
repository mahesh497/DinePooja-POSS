import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      outletId: string;
      outletName: string;
    };
  }

  interface User {
    id: string;
    role: Role;
    outletId: string;
    outletName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    outletId: string;
    outletName: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { outlet: true },
        });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          outletId: user.outletId,
          outletName: user.outlet.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.outletId = user.outletId;
        token.outletName = user.outletName;
      }

      // Refresh from DB so reseeded outlet IDs don't break FK writes
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          include: { outlet: true },
        });
        if (dbUser?.active) {
          token.role = dbUser.role;
          token.outletId = dbUser.outletId;
          token.outletName = dbUser.outlet.name;
          token.name = dbUser.name;
          token.email = dbUser.email;
        } else if (token.email) {
          const byEmail = await prisma.user.findUnique({
            where: { email: String(token.email).toLowerCase() },
            include: { outlet: true },
          });
          if (byEmail?.active) {
            token.id = byEmail.id;
            token.role = byEmail.role;
            token.outletId = byEmail.outletId;
            token.outletName = byEmail.outlet.name;
            token.name = byEmail.name;
            token.email = byEmail.email;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.outletId = token.outletId;
      session.user.outletName = token.outletName;
      if (token.name) session.user.name = String(token.name);
      if (token.email) session.user.email = String(token.email);
      return session;
    },
  },
};
