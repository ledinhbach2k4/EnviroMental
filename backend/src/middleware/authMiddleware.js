import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { ENV } from "../config/env.js";

// Ensure Clerk has a publishable key available (dev fallback)
if (!process.env.CLERK_PUBLISHABLE_KEY && ENV.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = ENV.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export const authMiddleware = ClerkExpressRequireAuth();
