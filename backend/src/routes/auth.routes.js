// routes/auth.routes.js
import express from "express";
import { requireAuth, clerkClient } from "@clerk/express";

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

export default router;