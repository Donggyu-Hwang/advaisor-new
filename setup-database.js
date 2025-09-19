#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  console.error(
    "Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database...");

    // Read SQL file
    const sqlContent = fs.readFileSync("./database-setup.sql", "utf8");

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && !s.startsWith("/*"))
      .filter(
        (s) => !s.includes("CREATE POLICY") || !s.includes("storage.objects")
      ); // Skip storage policies for now

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error && !error.message.includes("already exists")) {
          console.warn(`⚠️  Warning for statement ${i + 1}:`, error.message);
        }
      }
    }

    console.log("✅ Database tables created successfully!");

    // Test tables exist
    console.log("🔍 Verifying tables...");

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .limit(1);

    const { data: analysisResults, error: analysisError } = await supabase
      .from("analysis_results")
      .select("*")
      .limit(1);

    if (!projectsError && !analysisError) {
      console.log("✅ Tables verified successfully!");
      console.log("");
      console.log("📋 Next steps:");
      console.log(
        '1. 🪣 Create storage bucket "ir-files" in Supabase Dashboard → Storage'
      );
      console.log("2. 🔄 Restart your development server");
      console.log("3. 🌐 Visit http://localhost:5174 to test the application");
    } else {
      console.error("❌ Table verification failed:");
      if (projectsError) console.error("Projects table error:", projectsError);
      if (analysisError)
        console.error("Analysis results table error:", analysisError);
    }
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
