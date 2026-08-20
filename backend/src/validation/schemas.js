import { z } from "zod";

/**
 * Zod validation schemas for API routes
 * All request bodies should be validated using these schemas
 */

/**
 * Mood entry schemas
 */
export const createMoodEntrySchema = z.object({
  body: z.object({
    moodLevel: z.number().int().min(1).max(10, "Mood level must be between 1 and 10"),
    note: z.string().max(1000, "Note must be less than 1000 characters").optional(),
    factors: z.array(z.string()).optional(),
  }),
});

/**
 * Habit schemas
 */
export const createHabitSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    description: z.string().max(500, "Description must be less than 500 characters").optional(),
    icon: z.string().optional(),
  }),
});

export const habitLogSchema = z.object({
  params: z.object({
    habitId: z.string().regex(/^\d+$/, "Invalid habit ID"),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    completed: z.boolean().optional(),
  }),
});

export const habitIdParamSchema = z.object({
  params: z.object({
    habitId: z.string().regex(/^\d+$/, "Invalid habit ID"),
  }),
});

/**
 * Environment data schemas
 */
export const createEnvironmentDataSchema = z.object({
  body: z.object({
    temperature: z.number().min(-50).max(60, "Invalid temperature").optional(),
    humidity: z.number().min(0).max(100, "Humidity must be between 0 and 100").optional(),
    airQualityIndex: z.number().int().min(0).max(500, "Invalid AQI").optional(),
    noiseLevel: z.number().min(0).max(140, "Invalid noise level").optional(),
    lightLevel: z.number().min(0).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one environment field is required",
  }),
});

/**
 * Emergency contact schemas
 */
export const createEmergencyContactSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    phone: z.string().regex(/^[+]?[\d\s\-()]{7,20}$/, "Invalid phone number format").optional(),
    relation: z.string().max(50, "Relation too long").optional(),
  }),
});

/**
 * Goal schemas
 */
export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().max(1000, "Description too long").optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format").optional(),
  }),
});

/**
 * Notification schemas
 */
export const createNotificationSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required").max(500, "Content too long"),
    scheduledAt: z.string().datetime("Invalid datetime format").optional(),
  }),
});

/**
 * Forum schemas
 */
export const createForumPostSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    content: z.string().min(1, "Content is required").max(5000, "Content too long"),
    isAnonymous: z.boolean().optional(),
  }),
});

export const createForumCommentSchema = z.object({
  body: z.object({
    postId: z.number().int().positive("Invalid post ID"),
    comment: z.string().min(1, "Comment is required").max(2000, "Comment too long"),
  }),
});

/**
 * Suggestion schemas
 */
export const createSuggestionSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Content is required").max(1000, "Content too long"),
  }),
});

/**
 * Appointment schemas
 */
export const createAppointmentSchema = z.object({
  body: z.object({
    therapistName: z.string().min(1, "Therapist name is required").max(100, "Name too long"),
    scheduledAt: z.string().datetime("Invalid datetime format"),
    notes: z.string().max(1000, "Notes too long").optional(),
    status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  }),
});

export const updateAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid appointment ID"),
  }),
  body: z.object({
    therapistName: z.string().max(100, "Name too long").optional(),
    scheduledAt: z.string().datetime("Invalid datetime format").optional(),
    notes: z.string().max(1000, "Notes too long").optional(),
    status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  }),
});

/**
 * Chat schemas
 */
export const createChatMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message is required").max(4000, "Message too long"),
  }),
});

/**
 * Stress Wellness Scan schemas
 */
export const createStressScanSchema = z.object({
  body: z.object({
    // Self-assessment (required)
    stressLevel: z.number().int().min(1).max(10, "Stress level must be between 1 and 10"),
    moodLevel: z.number().int().min(1).max(10, "Mood level must be between 1 and 10").optional(),
    anxietyLevel: z.number().int().min(1).max(10, "Anxiety level must be between 1 and 10").optional(),
    sleepQuality: z.number().int().min(1).max(10, "Sleep quality must be between 1 and 10").optional(),
    energyLevel: z.number().int().min(1).max(10, "Energy level must be between 1 and 10").optional(),
    motivationLevel: z.number().int().min(1).max(10, "Motivation level must be between 1 and 10").optional(),
    notes: z.string().max(5000, "Notes must be less than 5000 characters").optional(),
    recentNegativeEvents: z.array(z.string()).optional(),

    // Environmental data (optional - will be auto-populated if available)
    temperature: z.number().min(-50).max(60).optional(),
    humidity: z.number().min(0).max(100).optional(),
    airQualityIndex: z.number().int().min(0).max(500).optional(),
    uvIndex: z.number().int().min(0).max(11).optional(),
    noiseLevel: z.number().min(0).max(140).optional(),
    timeSpentIndoors: z.number().int().min(0).optional(),
    timeSpentOutdoors: z.number().int().min(0).optional(),
    locationType: z.enum(["urban", "suburban", "rural"]).optional(),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  }),
});

export const stressScanIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid scan ID"),
  }),
});

export const stressScanQuerySchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

/**
 * Validation middleware factory
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};