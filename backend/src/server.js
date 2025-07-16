import express from 'express';
import bodyParser from 'body-parser';
import { ENV } from './config/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema.js';
import { eq } from 'drizzle-orm';
import job from './config/cron.js';

const app = express();
const PORT = ENV.PORT || 5001;

// Start the cron job
if (ENV.NODE_ENV === "production") job.start();

app.use(bodyParser.json());

// PostgreSQL + Drizzle
const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});
const db = drizzle(pool, { schema });

/* === 0. Health Check === */
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

/* === 1. Users (Auth/Register - Simple) === */
app.post("/api/users", async (req, res) => {
  const { name, email, passwordHash } = req.body;
  try {
    const [user] = await db.insert(schema.users).values({ name, email, passwordHash }).returning();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* === 2. Mood Entries === */
app.get("/api/moods", async (req, res) => {
  const data = await db.select().from(schema.moodEntries);
  res.json(data);
});

app.post("/api/moods", async (req, res) => {
  const { userId, moodLevel, note } = req.body;
  const [entry] = await db.insert(schema.moodEntries).values({ userId, moodLevel, note }).returning();
  res.status(201).json(entry);
});

/* === 3. Habits === */
app.get("/api/habits", async (req, res) => {
  const data = await db.select().from(schema.habits);
  res.json(data);
});

app.post("/api/habits", async (req, res) => {
  const { userId, name, description } = req.body;
  const [habit] = await db.insert(schema.habits).values({ userId, name, description }).returning();
  res.status(201).json(habit);
});

/* === 4. Habit Logs === */
app.post("/api/habit-logs", async (req, res) => {
  const { habitId, logDate, completed } = req.body;
  const [log] = await db.insert(schema.habitLogs).values({ habitId, logDate, completed }).returning();
  res.status(201).json(log);
});

/* === 5. Notifications === */
app.get("/api/notifications", async (req, res) => {
  const data = await db.select().from(schema.notifications);
  res.json(data);
});

app.post("/api/notifications", async (req, res) => {
  const { userId, content, scheduledAt } = req.body;
  const [noti] = await db.insert(schema.notifications).values({ userId, content, scheduledAt }).returning();
  res.status(201).json(noti);
});

/* === 6. Goals === */
app.get("/api/goals", async (req, res) => {
  const data = await db.select().from(schema.goals);
  res.json(data);
});

app.post("/api/goals", async (req, res) => {
  const { userId, title, description, dueDate } = req.body;
  const [goal] = await db.insert(schema.goals).values({ userId, title, description, dueDate }).returning();
  res.status(201).json(goal);
});

/* === 7. Meditations === */
app.get("/api/meditations", async (req, res) => {
  const data = await db.select().from(schema.meditations);
  res.json(data);
});

/* === 8. Mindfulness Exercises === */
app.get("/api/mindfulness", async (req, res) => {
  const data = await db.select().from(schema.mindfulnessExercises);
  res.json(data);
});

/* === 9. Chat Logs === */
app.get("/api/chat", async (req, res) => {
  const data = await db.select().from(schema.chatLogs);
  res.json(data);
});

app.post("/api/chat", async (req, res) => {
  const { userId, sender, message } = req.body;
  const [msg] = await db.insert(schema.chatLogs).values({ userId, sender, message }).returning();
  res.status(201).json(msg);
});

/* === 10. Appointments === */
app.get("/api/appointments", async (req, res) => {
  const data = await db.select().from(schema.appointments);
  res.json(data);
});

app.post("/api/appointments", async (req, res) => {
  const { userId, therapistName, scheduledAt, notes } = req.body;
  const [apt] = await db.insert(schema.appointments).values({ userId, therapistName, scheduledAt, notes }).returning();
  res.status(201).json(apt);
});

/* === 11. Forum Posts + Comments === */
app.get("/api/forum-posts", async (req, res) => {
  const data = await db.select().from(schema.forumPosts);
  res.json(data);
});

app.post("/api/forum-posts", async (req, res) => {
  const { userId, title, content, isAnonymous } = req.body;
  const [post] = await db.insert(schema.forumPosts).values({ userId, title, content, isAnonymous }).returning();
  res.status(201).json(post);
});

app.get("/api/forum-comments", async (req, res) => {
  const data = await db.select().from(schema.forumComments);
  res.json(data);
});

app.post("/api/forum-comments", async (req, res) => {
  const { postId, userId, comment } = req.body;
  const [cmt] = await db.insert(schema.forumComments).values({ postId, userId, comment }).returning();
  res.status(201).json(cmt);
});

/* === 12. Emergency Contacts === */
app.get("/api/emergency-contacts", async (req, res) => {
  const data = await db.select().from(schema.emergencyContacts);
  res.json(data);
});

app.post("/api/emergency-contacts", async (req, res) => {
  const { userId, name, phone, relation } = req.body;
  const [contact] = await db.insert(schema.emergencyContacts).values({ userId, name, phone, relation }).returning();
  res.status(201).json(contact);
});

/* === 13. Hotlines === */
app.get("/api/hotlines", async (req, res) => {
  const data = await db.select().from(schema.hotlines);
  res.json(data);
});

/* === 14. Suggestions === */
app.get("/api/suggestions", async (req, res) => {
  const data = await db.select().from(schema.suggestions);
  res.json(data);
});

app.post("/api/suggestions", async (req, res) => {
  const { userId, content } = req.body;
  const [sug] = await db.insert(schema.suggestions).values({ userId, content }).returning();
  res.status(201).json(sug);
});

/* === 15. Environment Data (optional - for advanced stats) === */
app.post("/api/environment", async (req, res) => {
  const { userId, temperature, humidity, airQualityIndex, noiseLevel, lightLevel } = req.body;
  const [env] = await db.insert(schema.environmentData).values({
    userId, temperature, humidity, airQualityIndex, noiseLevel, lightLevel
  }).returning();
  res.status(201).json(env);
});

/* === Start Server === */
app.listen(PORT, () => {
  console.log("✅ Server is running on port:", PORT);
});
