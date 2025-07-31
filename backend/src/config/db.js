import { drizzle } from "drizzle-orm/neon-http";
import {neon} from "@neondatabase/serverless";
import { ENV } from "./env.js";
<<<<<<< HEAD
import * as schema from "../db/schema.js";
=======
import * as schema from "./db/schema.js";
>>>>>>> de368f6aef3c9a55002df5a245cc5b7285e13495

const sql = neon(ENV.DATABASE_URL)
export const db = drizzle(sql, {schema} );