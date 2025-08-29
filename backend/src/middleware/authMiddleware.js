import { requireAuth } from "@clerk/express";

export const authMiddleware = requireAuth();