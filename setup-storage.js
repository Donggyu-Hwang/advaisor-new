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

async function setupStorage() {
  try {
    console.log("🪣 Setting up storage bucket...");

    // Create bucket
    const { data: bucket, error: bucketError } =
      await supabase.storage.createBucket("ir-files", {
        public: false,
        allowedMimeTypes: ["application/pdf"],
        fileSizeLimit: 1024 * 1024 * 100, // 100MB
      });

    if (bucketError && !bucketError.message.includes("already exists")) {
      console.error("❌ Failed to create bucket:", bucketError);
    } else {
      console.log('✅ Storage bucket "ir-files" created successfully!');
    }

    // List buckets to verify
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (!listError) {
      console.log("📋 Available buckets:");
      buckets.forEach((b) => {
        console.log(`   - ${b.name} (${b.public ? "public" : "private"})`);
      });
    }

    console.log("");
    console.log("✅ Storage setup complete!");
    console.log("📋 Next step: Test the application at http://localhost:5174");
  } catch (error) {
    console.error("❌ Storage setup failed:", error);
  }
}

setupStorage();
