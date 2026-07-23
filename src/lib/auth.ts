import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginWithAlfaApi } from "./api-client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessToken: { label: "Access Token", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Client already validated with Alfa API — create session from token
        if (credentials.accessToken && credentials.userId) {
          return {
            id: credentials.userId,
            email: credentials.email,
            accessToken: credentials.accessToken,
          };
        }

        if (!credentials.password) {
          return null;
        }

        try {
          const result = await loginWithAlfaApi(
            credentials.email,
            credentials.password
          );

          if (!result.isSuccess || !result.token || !result.userId) {
            return null;
          }

          return {
            id: result.userId,
            email: credentials.email,
            accessToken: result.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accessToken = user.accessToken;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
