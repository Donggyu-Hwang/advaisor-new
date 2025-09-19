#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log("🔍 Checking database structure...\n");

  try {
    // Check projects table
    console.log("📋 Checking projects table...");
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .limit(1);

    if (projectsError) {
      console.log("❌ Projects table error:", projectsError.message);
    } else {
      console.log("✅ Projects table exists and accessible");
    }

    // Check analysis_results table
    console.log("📋 Checking analysis_results table...");
    const { data: analysis, error: analysisError } = await supabase
      .from("analysis_results")
      .select("*")
      .limit(1);

    if (analysisError) {
      console.log("❌ Analysis results table error:", analysisError.message);
    } else {
      console.log("✅ Analysis results table exists and accessible");
    }

    // Check project_pages table
    console.log("📋 Checking project_pages table...");
    const { data: pages, error: pagesError } = await supabase
      .from("project_pages")
      .select("*")
      .limit(1);

    if (pagesError) {
      console.log("❌ Project pages table error:", pagesError.message);
    } else {
      console.log("✅ Project pages table exists and accessible");
    }

    // Check final_reports table
    console.log("📋 Checking final_reports table...");
    const { data: reports, error: reportsError } = await supabase
      .from("final_reports")
      .select("*")
      .limit(1);

    if (reportsError) {
      console.log("❌ Final reports table error:", reportsError.message);
    } else {
      console.log("✅ Final reports table exists and accessible");
    }

    // Check storage bucket
    console.log("📋 Checking storage buckets...");
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log("❌ Storage buckets error:", bucketsError.message);
    } else {
      console.log("✅ Storage buckets:");
      buckets.forEach((bucket) => {
        console.log(
          `   - ${bucket.name} (${bucket.public ? "public" : "private"})`
        );
      });
    }

    // Test authentication
    console.log("\n🔐 Testing authentication...");
    const {
      data: { users },
      error: usersError,
    } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.log("❌ Auth error:", usersError.message);
    } else {
      console.log(`✅ Authentication working. Users count: ${users.length}`);
    }
  } catch (error) {
    console.error("❌ Database check failed:", error);
  }
}

checkDatabase();
