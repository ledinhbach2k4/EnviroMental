import { pgTable, serial, text, timestamp, integer, boolean, real, date } from "drizzle-orm/pg-core";

// Bảng người dùng
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bảng ghi nhật ký tâm trạng
export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  moodLevel: integer("mood_level").notNull(), // Should be 1-10, validate in app layer
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bảng thói quen
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ghi nhận thực hiện thói quen
export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").references(() => habits.id),
  logDate: date("log_date").notNull(),
  completed: boolean("completed").default(false),
});

// Dữ liệu môi trường từ IoT
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

// Bảng danh bạ khẩn cấp
export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  relation: text("relation"),
});

// Bảng trò chuyện (AI/Chuyên gia)
export const chatLogs = pgTable("chat_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sender: text("sender").notNull(), // 'user', 'ai', 'therapist'
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mục tiêu cải thiện
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title"),
  description: text("description"),
  dueDate: date("due_date"),
  isCompleted: boolean("is_completed").default(false),
});

// Nhắc nhở hệ thống
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  content: text("content"),
  isRead: boolean("is_read").default(false),
  scheduledAt: timestamp("scheduled_at"),
});
