import { pgTable, serial, text, timestamp, integer, boolean, real, date } from "drizzle-orm/pg-core";

/* ---------- Người dùng ---------- */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Ghi nhật ký tâm trạng ---------- */
export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  moodLevel: integer("mood_level").notNull(), // 1-10
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Thói quen ---------- */
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Nhật ký thực hiện thói quen ---------- */
export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  logDate: date("log_date").notNull(),
  completed: boolean("completed").default(false),
});

/* ---------- Dữ liệu môi trường từ IoT ---------- */
export const environmentData = pgTable("environment_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  temperature: real("temperature"),
  humidity: real("humidity"),
  airQualityIndex: integer("air_quality_index"),
  noiseLevel: real("noise_level"),
  lightLevel: real("light_level"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

/* ---------- Danh bạ khẩn cấp ---------- */
export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  relation: text("relation"),
});

/* ---------- Trò chuyện (AI, chuyên gia) ---------- */
export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sender: text("sender").notNull(), // 'user', 'ai', 'therapist'
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Mục tiêu cải thiện ---------- */
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title"),
  description: text("description"),
  dueDate: date("due_date"),
  isCompleted: boolean("is_completed").default(false),
});

/* ---------- Nhắc nhở ---------- */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  content: text("content"),
  isRead: boolean("is_read").default(false),
  scheduledAt: timestamp("scheduled_at"),
});

/* ---------- Bài thiền (Meditation) ---------- */
export const meditations = pgTable("meditations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  mediaUrl: text("media_url").notNull(),
  duration: integer("duration"),
  type: text("type"), // 'audio', 'video', 'breathing'
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Bài tập chánh niệm ---------- */
export const mindfulnessExercises = pgTable("mindfulness_exercises", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  type: text("type"), // 'breathing', 'body_scan', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Bài đăng diễn đàn ---------- */
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Bình luận bài viết ---------- */
export const forumComments = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => forumPosts.id),
  userId: integer("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Hotline hỗ trợ ---------- */
export const hotlines = pgTable("hotlines", {
  id: serial("id").primaryKey(),
  country: text("country"),
  region: text("region"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  description: text("description"),
});

/* ---------- Gợi ý cải thiện cá nhân ---------- */
export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ---------- Lịch hẹn với chuyên gia ---------- */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  therapistName: text("therapist_name").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").default("pending"), // 'pending', 'confirmed', 'cancelled'
  notes: text("notes"),
});
