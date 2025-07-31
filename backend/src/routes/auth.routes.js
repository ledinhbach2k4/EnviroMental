import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";

const router = express.Router();

router.get("/me", ClerkExpressRequireAuth(), async (req, res) => {
  const { userId } = req.auth;

  try {
    const user = await clerkClient.users.getUser(userId);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user info", error: err.message });
  }
});

router.post("/sync-user", ClerkExpressRequireAuth(), async (req, res) => {
  const { userId } = req.auth;

  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = clerkUser.firstName || "Unknown";

    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    if (!existingUser) {
      await db.insert(users).values({
        name,
        email,
        passwordHash: "",
      });
    }

    res.status(200).json({ message: "User synced successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to sync user", error: err.message });
  }
});

export default router;
