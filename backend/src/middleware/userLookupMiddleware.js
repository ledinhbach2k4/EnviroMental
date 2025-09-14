import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const userLookupMiddleware = async (req, res, next) => {
  const clerkId = req.auth.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    let [user] = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId));

    if (!user) {
      // This is a new user, create an entry in our DB
      console.log(`New user detected. Clerk ID: ${clerkId}. Creating entry in DB.`);
      
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkId);
        console.log("Clerk user data:", JSON.stringify(clerkUser, null, 2));
      } catch (clerkErr) {
        console.error(`Error fetching user ${clerkId} from Clerk:`, clerkErr);
        // We can proceed with fallback values, but we should log this serious issue.
      }

      let email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (!email) {
        email = `no-email-${clerkId}@placeholder.com`;
        console.warn(`Email not found for Clerk user ${clerkId}. Using fallback: ${email}`);
      }

      let name = 'New User';
      if (clerkUser) {
        const { firstName, lastName, username } = clerkUser;
        if (firstName) {
          name = `${firstName} ${lastName || ''}`.trim();
        } else if (username) {
          name = username;
        }
      }

      const newUserPayload = {
        clerkId: clerkId,
        email: email,
        name: name,
      };

      console.log("Inserting new user with params:", JSON.stringify(newUserPayload, null, 2));

      try {
        [user] = await db.insert(schema.users).values(newUserPayload).returning();
      } catch (dbErr) {
        // Check if it's the unique email constraint violation
        if (dbErr.cause?.code === '23505' && dbErr.cause?.constraint === 'users_email_unique') {
          console.warn(`Attempted to insert a user with an existing email: ${newUserPayload.email}. Linking clerkId to existing user.`);
          
          // Find the existing user by email and update them
          const [updatedUser] = await db.update(schema.users)
            .set({ clerkId: newUserPayload.clerkId, name: newUserPayload.name })
            .where(eq(schema.users.email, newUserPayload.email))
            .returning();

          if (updatedUser) {
            user = updatedUser;
          } else {
            // This is an unexpected state. The DB said the email exists, but we can't find it.
            console.error("Could not find and update user by email after unique constraint violation. This should not happen.");
            throw dbErr; // Re-throw the original error.
          }
        } else {
          // It's a different database error, re-throw it.
          console.error("Error inserting new user into database:", dbErr);
          throw dbErr;
        }
      }
    }

    req.internalUserId = user.id;
    if (!req.internalUserId) {
      // This case should ideally not be reached if insert is successful
      return res.status(500).json({ error: "Failed to resolve user ID after creation." });
    }
    next();
  } catch (err) {
    console.error("Error in user lookup middleware:", err);
    res.status(500).json({ error: "Internal server error during user lookup or creation." });
  }
};
