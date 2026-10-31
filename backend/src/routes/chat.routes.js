import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createChatMessageSchema } from "../validation/schemas.js";
import { eq, asc } from "drizzle-orm";
import axios from "axios";

const router = express.Router();

// Load the API key from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Strict Model Configuration:
 * - Chat completions: strictly an LLM (openai/gpt-oss-20b)
 * - Audio transcription: strictly Whisper (whisper-large-v3)
 */
export const GROQ_CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL && !process.env.GROQ_CHAT_MODEL.toLowerCase().includes("whisper")
    ? process.env.GROQ_CHAT_MODEL
    : "openai/gpt-oss-20b";

export const GROQ_AUDIO_MODEL = "whisper-large-v3";

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
 * Send a new text message and receive an AI response from Groq.
 * Strictly uses openai/gpt-oss-20b for /chat/completions.
 */
router.post("/", authMiddleware, validate(createChatMessageSchema), async (req, res) => {
  const { message } = req.body;

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
    // Strictly enforce a valid conversational LLM for chat completions
    const chatModel = GROQ_CHAT_MODEL;

    const groqPayload = {
      model: chatModel, // strictly "openai/gpt-oss-20b"
      messages: [
        {
          role: "system",
          content:
            "You are a mental health expert in the EnviroMental application. Only answer questions related to emotions, stress, meditation, living environment, and psychology.",
        },
        { role: "user", content: message },
      ],
    };

    console.log(`[Groq] Sending chat completion request using model: ${chatModel}`);
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      groqPayload,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    aiReply = response.data.choices?.[0]?.message?.content ?? "";
    // Strip reasoning tags (e.g., DeepSeek-R1) before returning to client
    aiReply = aiReply.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
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

/**
 * POST /transcribe
 * Audio transcription endpoint strictly using Groq's whisper-large-v3 model.
 * Audio is forwarded ONLY to /audio/transcriptions.
 */
router.post("/transcribe", authMiddleware, async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: "Server misconfiguration",
      detail: "GROQ_API_KEY is missing on the server",
    });
  }

  try {
    const { audioBase64, mimeType = "audio/m4a" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", blob, `audio.${mimeType.split("/")[1] || "m4a"}`);
    formData.append("model", GROQ_AUDIO_MODEL); // strictly whisper-large-v3 for audio transcriptions

    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      }
    );

    const transcribedText = response.data?.text ?? "";
    return res.status(200).json({ text: transcribedText });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error("Groq Transcription error:", status, data || err.message);
    return res.status(500).json({
      error: "Failed to transcribe audio with Whisper",
      detail: data || err.message,
    });
  }
});

export default router;
