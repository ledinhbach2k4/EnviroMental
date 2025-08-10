import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { eq, asc } from "drizzle-orm";
import axios from "axios";

const router = express.Router();

// 🔐 Load API key từ biến môi trường (đừng hardcode key!)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Lấy tất cả tin nhắn của người dùng
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

// ✅ Gửi tin nhắn mới và nhận phản hồi từ OpenAI
router.post("/", authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // 🧠 Gửi message đến OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia sức khỏe tâm thần trong ứng dụng EnviroMental. Chỉ trả lời các câu hỏi liên quan đến cảm xúc, stress, thiền, môi trường sống và tâm lý.",
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

    // 💾 Lưu câu hỏi của người dùng
    await db.insert(schema.chatLogs).values({
      userId: req.userId,
      sender: "user",
      message,
    });

    // 💾 Lưu câu trả lời của AI
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
