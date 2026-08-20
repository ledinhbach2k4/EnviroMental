import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createChatMessageSchema } from "../validation/schemas.js";
import { eq, asc } from "drizzle-orm";
import axios from "axios";

const router = express.Router();

// Load the API key from environment variables (do not hardcode the key)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Dynamic model selection
let activeGroqModel = null;

async function initializeGroqModel() {
  if (activeGroqModel) return activeGroqModel;

  if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set, cannot initialize model");
    return null;
  }

  try {
    const response = await axios.get(
      "https://api.groq.com/openai/v1/models",
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 5000,
      }
    );

    const models = response.data?.data ?? [];
    if (models.length === 0) {
      console.warn("No Groq models available for this API key");
      return null;
    }

    // Filter out moderation/vision models - only keep conversational models
    const conversationalModels = models.filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes("guard") && !id.includes("vision");
    });

    if (conversationalModels.length === 0) {
      console.warn("No conversational models available, falling back to all models");
      // Fallback to all models if filtering removed everything
      return models[0].id;
    }

    // Prefer models: llama-3.3 > llama-3.1 > mixtral > other conversational
    const preferredOrder = ["llama-3.3", "llama-3.1", "mixtral"];
    let preferred = null;

    for (const keyword of preferredOrder) {
      preferred = conversationalModels.find(m => m.id.toLowerCase().includes(keyword));
      if (preferred) break;
    }

    activeGroqModel = preferred ? preferred.id : conversationalModels[0].id;
    console.log("Selected Groq model:", activeGroqModel);
    return activeGroqModel;
  } catch (err) {
    console.error("Failed to initialize Groq model:", err.response?.data || err.message);
    return null;
  }
}

let availableModelsLogged = false;

async function logAvailableModels() {
  if (availableModelsLogged) return;
  availableModelsLogged = true;

  // Guard: skip if no API key (prevents crash on startup/config issues)
  if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set, skipping model discovery");
    return;
  }

  try {
    const response = await axios.get(
      "https://api.groq.com/openai/v1/models",
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 5000, // 5s timeout to prevent hanging
      }
    );
    const modelIds = response.data?.data?.map(m => m.id) ?? [];
    console.log("=== Available Groq Models for this API Key ===");
    console.log(modelIds.length ? modelIds.join("\n") : "(none)");
    console.log("===============================================");
  } catch (err) {
    // Never throw - log and continue
    console.error("Failed to fetch available Groq models:", err.response?.data || err.message);
  }
}

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
    // Initialize dynamic model on first request
    if (!activeGroqModel) {
      await initializeGroqModel();
    }

    // Fallback if model initialization failed
    const modelToUse = activeGroqModel || "llama-3.1-8b-instant";

    // Log available models on first request (for debugging)
    await logAvailableModels();

    // Send the user message to Groq
    const groqPayload = {
      model: modelToUse,
      messages: [
        {
          role: "system",
          content:
            "You are a mental health expert in the EnviroMental application. Only answer questions related to emotions, stress, meditation, living environment, and psychology.",
        },
        { role: "user", content: message },
      ],
    };
    console.log("Groq request payload:", JSON.stringify(groqPayload, null, 2));
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      groqPayload,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    aiReply = response.data.choices?.[0]?.message?.content ?? "";
    // Strip reasoning tags (e.g., DeepSeek-R1) before returning to client
    aiReply = aiReply.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
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