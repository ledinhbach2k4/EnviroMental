import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq, asc } from "drizzle-orm";
import axios from "axios";

const router = express.Router();

// Load the API key from environment variables (do not hardcode the key)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * GET /
 * Retrieve all chat messages for the authenticated user.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const messages = await db
      .select()
      .from(schema.chatLogs)
      .where(eq(schema.chatLogs.userId, req.userId))
      .orderBy(asc(schema.chatLogs.createdAt));

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat logs", detail: err.message });
  }
});

/**
 * POST /
 * Send a new message and receive a response from the OpenAI API.
 */
router.post("/", authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Send the user message to OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
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
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiReply = response.data.choices[0].message.content;

    // Save the user's message to the database
    await db.insert(schema.chatLogs).values({
      userId: req.userId,
      sender: "user",
      message,
    });

    // Save the AI's response to the database
    const [savedAIMessage] = await db.insert(schema.chatLogs).values({
      userId: req.userId,
      sender: "ai",
      message: aiReply,
    }).returning();

    res.status(201).json(savedAIMessage);
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to get AI response", detail: err.message });
  }
});

export default router;
