import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { ENV } from './config/env.js';


const PORT = ENV.PORT || 5001;
app.listen(PORT, () => {
  console.log("✅ Server is running on port:", PORT);
});
export default app
