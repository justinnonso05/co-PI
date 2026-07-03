import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });

// CRITICAL FIX: The pg.Pool will crash the entire Node process if an idle connection 
// is closed by the database server (like Neon/Supabase do). We must attach an error 
// listener here to catch those idle drops silently. The pool will auto-recover.
pool.on('error', (err) => {
  console.error('pg.Pool idle client error (auto-recovered):', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
