import express from "express";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { userLookupMiddleware } from "../middleware/userLookupMiddleware.js";
import { validate } from "../validation/schemas.js";
import { createForumCommentSchema } from "../validation/schemas.js";
import { desc, eq } from "drizzle-orm";

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
    const transformedPosts = (posts || []).map((post) => ({
      id: post.id,
      userId: post.userId || null,
      title: post.title,
      message: post.message,
      author: { name: post.authorName, color: post.authorColor },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl || undefined,
    }));

    res.status(200).json(transformedPosts);
  } catch (err) {
    console.error("Error fetching forum posts:", err);
    res.status(500).json({
      error: "Failed to fetch posts",
      detail: err.message,
    });
  }
});

// Create a new community forum post (authenticated)
router.post("/", authMiddleware, async (req, res) => {
  const { id, title, message, author, hasImage, imageUrl } = req.body;
  const clerkUserId = req.auth?.userId;

  // Strict Security & Format Validation for Image Uploads
  if (hasImage || imageUrl) {
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid image: missing or malformed image data.",
      });
    }

    // Extract MIME type from the base64 header (e.g., data:image/jpeg;base64,...)
    const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid image format: must be a base64 encoded data URI (e.g., data:image/jpeg;base64,...).",
      });
    }

    const mimeType = mimeMatch[1].toLowerCase();
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        error: "Bad Request",
        message: `Unsupported image format: ${mimeType}. Allowed formats are image/jpeg, image/png, image/webp, and image/gif.`,
      });
    }
  }

  try {
    const [post] = await db
      .insert(schema.communityForumPosts)
      .values({
        id: id || Date.now().toString(),
        userId: clerkUserId || null,
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
      userId: post.userId || null,
      title: post.title,
      message: post.message,
      author: { name: post.authorName, color: post.authorColor },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl || undefined,
    };

    res.status(201).json(transformedPost);
  } catch (err) {
    console.error("Error creating forum post:", err);
    res.status(500).json({
      error: "Failed to create post",
      detail: err.message,
    });
  }
});

// Delete a community forum post (authenticated with strict ownership verification)
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Query post to verify existence and check ownership
    const [existingPost] = await db
      .select()
      .from(schema.communityForumPosts)
      .where(eq(schema.communityForumPosts.id, id));

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // 2. Strict ownership validation: If post has a recorded userId, verify it matches the authenticated user
    if (existingPost.userId && existingPost.userId !== clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this post" });
    }

    // 3. Delete post
    await db
      .delete(schema.communityForumPosts)
      .where(eq(schema.communityForumPosts.id, id));

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting forum post:", err);
    res.status(500).json({
      error: "Failed to delete post",
      detail: err.message,
    });
  }
});

// ======= COMMENTS =======

// Get all comments
router.get("/comments", async (req, res) => {
  try {
    const comments = await db.select().from(schema.forumComments);
    res.status(200).json(comments || []);
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
