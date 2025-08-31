// routes/auth.routes.js
import express from "express";
import { requireAuth, clerkClient } from "@clerk/express";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * GET /api/users/me
 * - Requires authentication with Clerk
 * - Returns the current logged-in user's information from Clerk
 */
router.get("/me", requireAuth(), async (req, res) => {
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
router.post("/sync-user", requireAuth(), async (req, res) => {
  const { userId } = req.auth;
  console.log(`[sync-user] Syncing user: ${userId}`);

  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = clerkUser.firstName || "Unknown";
    console.log(`[sync-user] Clerk User: ${name} (${email})`);

    // Check if user already exists in local DB
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    console.log(`[sync-user] Existing user in DB: ${existingUser ? existingUser.id : 'None'}`);

    if (!existingUser) {
      // Insert new user if not found
      const [insertedUser] = await db.insert(users).values({
        clerkId: userId,
        name,
        email,
      }).returning();
      console.log(`[sync-user] Inserted new user: ${insertedUser.id}`);
    } else {
      // Update user info if they already exist
      const [updatedUser] = await db.update(users).set({ name, clerkId: userId }).where(eq(users.email, email)).returning();
      console.log(`[sync-user] Updated existing user: ${updatedUser.id}`);
    }

    res.status(200).json({
      message: "User synced successfully",
      user: { name, email },
    });
  } catch (err) {
    console.error(`[sync-user] Failed to sync user:`, err);
    res
      .status(500)
      .json({ message: "Failed to sync user", error: err.message });
  }
});

export default router;
