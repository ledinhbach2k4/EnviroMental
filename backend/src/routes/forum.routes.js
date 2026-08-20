import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createForumPostSchema, createForumCommentSchema } from "../validation/schemas.js";

const router = express.Router();

// ======= POSTS =======

// Get all forum posts (public)
router.get("/posts", async (req, res) => {
  try {
    const posts = await db.select().from(schema.forumPosts);
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch posts",
      detail: err.message,
    });
  }
});

// Create a new post (authenticated)
router.post("/posts", authMiddleware, userLookupMiddleware, validate(createForumPostSchema), async (req, res) => {
  const { title, content, isAnonymous } = req.body;

  try {
    const [post] = await db
      .insert(schema.forumPosts)
      .values({
        userId: req.internalUserId,
        title,
        content,
        isAnonymous: isAnonymous ?? false,
      })
      .returning();

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({
      error: "Failed to create post",
      detail: err.message,
    });
  }
});

// ======= COMMENTS =======

// Get all comments (public, you might want to filter by postId in future)
router.get("/comments", async (req, res) => {
  try {
    const comments = await db.select().from(schema.forumComments);
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch comments",
      detail: err.message,
    });
  }
});

// Create a new comment (authenticated)
router.post("/comments", authMiddleware, userLookupMiddleware, validate(createForumCommentSchema), async (req, res) => {
  const { postId, comment } = req.body;

  try {
    const [newComment] = await db
      .insert(schema.forumComments)
      .values({
        postId,
        userId: req.internalUserId,
        comment,
      })
      .returning();

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({
      error: "Failed to add comment",
      detail: err.message,
    });
  }
});

export default router;