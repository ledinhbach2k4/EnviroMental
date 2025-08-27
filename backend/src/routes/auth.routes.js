// routes/auth.routes.js
import express from "express";
import { ClerkExpressRequireAuth, clerkClient } from "@clerk/express";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * GET /api/users/me
 * - Requires authentication with Clerk
 * - Returns the current logged-in user's information from Clerk
 */
router.get("/me", ClerkExpressRequireAuth(), async (req, res) => {
  const { userId } = req.auth; // Clerk adds this after successful auth

  try {
    const user = await clerkClient.users.getUser(userId);
    res.json({ user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user info", error: err.message });
  }
});

/**
 * POST /api/users/sync-user
 * - Requires authentication with Clerk
 * - Syncs the Clerk user to your local database (if not already present)
 * - If user exists, updates their info (e.g., name)
 */
router.post("/sync-user", ClerkExpressRequireAuth(), async (req, res) => {
  const { userId } = req.auth;

  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = clerkUser.firstName || "Unknown";

    // Check if user already exists in local DB
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    if (!existingUser) {
      // Insert new user if not found
      await db.insert(users).values({
        name,
        email,
        passwordHash: "", // Not needed because Clerk handles auth
      });
    } else {
      // Update user info if they already exist
      await db.update(users).set({ name }).where(eq(users.email, email));
    }

    res.status(200).json({
      message: "User synced successfully",
      user: { name, email },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to sync user", error: err.message });
  }
});

export default router;
