import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

export const testRoutes = Router();

// Test database connection
testRoutes.get("/db", async (req: Request, res: Response) => {
  try {
    // Try a simple auth test first
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      logger.info(
        "Auth test (expected to fail with anon key):",
        authError.message
      );
    }

    // Try to access system tables via raw SQL
    const { data, error } = await supabase.rpc("version");

    if (error) {
      logger.error("Database connection test failed:", error);

      // Try a different approach - test if we can at least connect
      const { data: testData, error: testError } = await supabase
        .from("projects") // This table doesn't exist yet, but connection should work
        .select("*")
        .limit(1);

      return res.json({
        status: testError ? "tables_missing" : "connected",
        database: "reachable",
        message: testError
          ? "Database connected but tables don't exist. Please run database setup."
          : "Database connected and tables exist",
        error: testError?.message,
        instructions: [
          "1. Go to Supabase Dashboard → SQL Editor",
          "2. Run the SQL from database-setup.sql file",
          "3. Restart the server",
        ],
      });
    }

    return res.json({
      status: "ok",
      database: "connected",
      postgresql_version: data,
      message: "Database connection successful",
    });
  } catch (error) {
    logger.error("Database test error:", error);
    return res.status(500).json({
      status: "error",
      message: "Database test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create tables endpoint
testRoutes.post("/create-tables", async (req: Request, res: Response) => {
  try {
    // Note: This won't work with anon key, but provides better error message
    logger.info("Attempting to create tables...");

    return res.json({
      status: "info",
      message:
        "Table creation requires service role key. Please use Supabase dashboard.",
      instructions: [
        "1. Go to Supabase Dashboard",
        "2. Navigate to SQL Editor",
        "3. Run the SQL from database-setup.sql",
        "4. Restart the server",
      ],
    });
  } catch (error) {
    logger.error("Create tables error:", error);
    return res.status(500).json({
      status: "error",
      message: "Create tables failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default testRoutes;
