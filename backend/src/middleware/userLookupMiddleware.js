import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

export const userLookupMiddleware = async (req, res, next) => {
  const clerkId = req.auth.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    let [user] = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId));

    if (!user) {
      // This is a new user, create an entry in our DB
      const userDetails = req.auth.sessionClaims;
      [user] = await db.insert(schema.users).values({
        clerkId: clerkId,
        email: userDetails.email,
        name: userDetails.username || 'New User',
      }).returning();
    }

    req.internalUserId = user.id;
    if (!req.internalUserId) {
      return res.status(500).json({ error: "Failed to resolve user ID" });
    }
    next();
  } catch (err) {
    console.error("Error in user lookup middleware:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};