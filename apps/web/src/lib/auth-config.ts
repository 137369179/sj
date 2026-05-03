import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";
import { logger } from "./logger";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? baseURL)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const AUTH_ENABLE_DEMO_LOGIN = process.env.AUTH_ENABLE_DEMO_LOGIN === "true";
export const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";

function logAuthEmail(kind: "verify-email" | "reset-password", to: string, url: string, token: string) {
  logger.info("Prepared auth email", {
    kind,
    to,
    url,
    token,
    provider: process.env.MAIL_PROVIDER ?? "console",
  });
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  baseURL,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    "default-dev-secret-key-change-me-in-prod",
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }) => {
      logAuthEmail("reset-password", user.email, url, token);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      logAuthEmail("verify-email", user.email, url, token);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["vendor", "organizer", "admin"],
        required: false,
        defaultValue: "vendor",
      },
      isVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    additionalFields: {
      activeRole: {
        type: ["vendor", "organizer", "admin"],
        required: false,
        defaultValue: "vendor",
        input: false,
      },
    },
  },
  plugins: [
    passkey({
      rpID: process.env.AUTH_PASSKEY_RP_ID ?? "localhost",
      rpName: process.env.AUTH_PASSKEY_RP_NAME ?? "Market Recruitment Platform",
      origin: baseURL,
    }),
    nextCookies(),
  ],
  experimental: {
    joins: true,
  },
});
