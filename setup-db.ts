import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log("🚀 Setting up database schema...");

  try {
    // Create projects table
    const { error: projectsError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.projects (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          project_name TEXT NOT NULL,
          company_name TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          file_url TEXT,
          report_url TEXT,
          progress_percentage INTEGER DEFAULT 0,
          total_pages INTEGER,
          processed_pages INTEGER DEFAULT 0,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `,
    });

    if (projectsError) {
      console.error("Error creating projects table:", projectsError);
    } else {
      console.log("✅ Projects table created successfully");
    }

    // Create analysis_results table
    const { error: analysisError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.analysis_results (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
          page_number INTEGER NOT NULL,
          analysis_type TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
      `,
    });

    if (analysisError) {
      console.error("Error creating analysis_results table:", analysisError);
    } else {
      console.log("✅ Analysis results table created successfully");
    }

    // Test database connection
    const { data, error } = await supabase
      .from("projects")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Error testing database connection:", error);
    } else {
      console.log("✅ Database connection test successful");
    }

    console.log("🎉 Database setup completed!");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
