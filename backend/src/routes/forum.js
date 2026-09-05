import { Router } from 'express';
import { db } from '../config/db.js';
import { communityForumPosts } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { requireAuth } from '@clerk/express';

const router = Router();

// GET: Fetch all posts
router.get('/', requireAuth({ signInUrl: false }), async (req, res) => {
  try {
    const posts = await db.select().from(communityForumPosts).orderBy(desc(communityForumPosts.createdAt));

    // Map database flat columns to frontend nested object structure
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      message: post.message,
      author: {
        name: post.authorName,
        color: post.authorColor
      },
      replyCount: post.replyCount,
      createdAt: post.createdAt,
      hasImage: post.hasImage,
      imageUrl: post.imageUrl
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST: Create a new post
router.post('/', requireAuth({ signInUrl: false }), async (req, res) => {
  try {
    const { id, title, message, author, hasImage, imageUrl } = req.body;

    // Insert mapping frontend nested object to database flat columns
    await db.insert(communityForumPosts).values({
      id: id || Date.now().toString(),
      title,
      message,
      authorName: author?.name || 'Anonymous',
      authorColor: author?.color || '#8641F4',
      hasImage: hasImage || false,
      imageUrl: imageUrl || null,
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating forum post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// DELETE: Delete a post
router.delete('/:id', requireAuth({ signInUrl: false }), async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(communityForumPosts).where(eq(communityForumPosts.id, id));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;