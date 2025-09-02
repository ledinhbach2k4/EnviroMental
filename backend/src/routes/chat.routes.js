import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq, asc } from "drizzle-orm";
import axios from "axios";

const router = express.Router();

// Load the API key from environment variables (do not hardcode the key)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * GET /
 * Retrieve all chat messages for the authenticated user.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.clerkId, req.auth.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await db
      .select()
      .from(schema.chatLogs)
      .where(eq(schema.chatLogs.userId, user.id))
      .orderBy(asc(schema.chatLogs.createdAt));

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat logs", detail: err.message });
  }
});

/**
 * POST /
 * Send a new message and receive a response from the Groq API.
 */
router.post("/", authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: "Server misconfiguration",
      detail: "GROQ_API_KEY is missing on the server",
    });
  }

  let user;
  try {
    user = await db.query.users.findFirst({
      where: eq(schema.users.clerkId, req.auth.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user", detail: err.message });
  }


  let aiReply;
  try {
    // Send the user message to Groq
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a mental health expert in the EnviroMental application. Only answer questions related to emotions, stress, meditation, living environment, and psychology.",
          },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    aiReply = response.data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error("Groq API error:", status, data || err.message);
    return res.status(500).json({
      error: "Failed to get AI response from Groq",
      detail: data || err.message,
    });
  }

  // Try to save chat logs; if DB fails, still return AI message
  try {
    await db.insert(schema.chatLogs).values({
      userId: user.id,
      sender: "user",
      message,
    });

    const [savedAIMessage] = await db
      .insert(schema.chatLogs)
      .values({
        userId: user.id,
        sender: "ai",
        message: aiReply,
      })
      .returning();

    return res.status(201).json(savedAIMessage);
  } catch (err) {
    console.error("DB save error:", err.message);
    return res.status(201).json({
      sender: "ai",
      message: aiReply,
      saved: false,
    });
  }
});

export default router;
