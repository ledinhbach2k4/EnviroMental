import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT || 5001,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
};