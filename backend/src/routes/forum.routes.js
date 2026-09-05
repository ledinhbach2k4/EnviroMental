import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createForumPostSchema, createForumCommentSchema } from "../validation/schemas.js";
import { desc } from "drizzle-orm";

const router = express.Router();

// ======= COMMUNITY FORUM POSTS (Frontend-compatible) =======

// Get all community forum posts (public, sorted newest first)
router.get("/", async (req, res) => {
  try {
    const posts = await db
      .select()
      .from(schema.communityForumPosts)
      .orderBy(desc(schema.communityForumPosts.createdAt));
    
    // Transform to match frontend ForumPost interface
    const transformedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      message: post.message,
      author: { name: post.authorName, color: post.authorColor },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl,
    }));
    
    res.status(200).json(transformedPosts);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch posts",
      detail: err.message,
    });
  }
});

// Create a new community forum post (authenticated)
router.post("/", authMiddleware, userLookupMiddleware, async (req, res) => {
  const { id, title, message, author, hasImage, imageUrl } = req.body;

  try {
    const [post] = await db
      .insert(schema.communityForumPosts)
      .values({
        id: id || Date.now().toString(),
        title,
        message,
        authorName: author?.name || "Anonymous",
        authorColor: author?.color || "#8641F4",
        replyCount: 0,
        hasImage: hasImage ?? false,
        imageUrl: imageUrl || null,
      })
      .returning();

    // Transform to match frontend ForumPost interface
    const transformedPost = {
      id: post.id,
      title: post.title,
      message: post.message,
      author: { name: post.authorName, color: post.authorColor },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl,
    };

    res.status(201).json(transformedPost);
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