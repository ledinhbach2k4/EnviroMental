import { Router } from 'express';
import { db } from '../config/db.js';
import { communityForumPosts } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireAuth } from '@clerk/express';

const router = Router();

// GET: Fetch all posts
router.get('/', async (req, res) => {
  try {
    const posts = await db.select().from(communityForumPosts).orderBy(desc(communityForumPosts.createdAt));

    // Map database flat columns to frontend nested object structure
    const formattedPosts = (posts || []).map((post) => ({
      id: post.id,
      userId: post.userId || null,
      title: post.title,
      message: post.message,
      author: {
        name: post.authorName,
        color: post.authorColor,
      },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl || undefined,
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST: Create a new post
router.post('/', requireAuth({ signInUrl: false }), async (req, res) => {
  const { id, title, message, author, hasImage, imageUrl } = req.body;
  const clerkUserId = req.auth?.userId;

  // Strict Security & Format Validation for Image Uploads
  if (hasImage || imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid image: missing or malformed image data.',
      });
    }

    // Extract MIME type from the base64 header (e.g., data:image/jpeg;base64,...)
    const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid image format: must be a base64 encoded data URI (e.g., data:image/jpeg;base64,...).',
      });
    }

    const mimeType = mimeMatch[1].toLowerCase();
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unsupported image format: ${mimeType}. Allowed formats are image/jpeg, image/png, image/webp, and image/gif.`,
      });
    }
  }

  try {

    const [post] = await db
      .insert(communityForumPosts)
      .values({
        id: id || Date.now().toString(),
        userId: clerkUserId || null,
        title,
        message,
        authorName: author?.name || 'Anonymous',
        authorColor: author?.color || '#8641F4',
        replyCount: 0,
        hasImage: hasImage || false,
        imageUrl: imageUrl || null,
      })
      .returning();

    const formattedPost = {
      id: post.id,
      userId: post.userId || null,
      title: post.title,
      message: post.message,
      author: {
        name: post.authorName,
        color: post.authorColor,
      },
      replyCount: post.replyCount ?? 0,
      createdAt: post.createdAt,
      hasImage: post.hasImage ?? false,
      imageUrl: post.imageUrl || undefined,
    };

    res.status(201).json(formattedPost);
  } catch (error) {
    console.error('Error creating forum post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// DELETE: Delete a post with strict ownership check
router.delete('/:id', requireAuth({ signInUrl: false }), async (req, res) => {
  try {
    const { id } = req.params;
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [existingPost] = await db
      .select()
      .from(communityForumPosts)
      .where(eq(communityForumPosts.id, id));

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.userId && existingPost.userId !== clerkUserId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this post' });
    }

    await db.delete(communityForumPosts).where(eq(communityForumPosts.id, id));
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
