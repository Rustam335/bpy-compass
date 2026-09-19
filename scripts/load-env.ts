/**
 * Load .env.local (then .env) before any other module reads process.env.
 * Must be the FIRST import of every script: ES imports are hoisted and evaluated in order,
 * so calling dotenv inside the script body would run after lib/model.ts has already read env.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });
