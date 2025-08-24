import express from "express";
import dotenv from 'dotenv';
import job from "./config/cron.js";
dotenv.config();

import app from './app.js';
import { ENV } from './config/env.js';


const PORT = ENV.PORT || 5001;
// Start the cron job
if (ENV.NODE_ENV === 'production') job.start();

app.listen(PORT, () => {
  console.log("✅ Server is running on port:", PORT);
});
export default app
