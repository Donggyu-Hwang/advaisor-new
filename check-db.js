const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.error("SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log("🚀 Creating database tables...");

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .limit(1);

    if (testError) {
      console.error("❌ Database connection failed:", testError);
      return;
    }

    console.log("✅ Database connection successful");

    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["projects", "analysis_results"]);

    console.log(
      "Existing tables:",
      existingTables?.map((t) => t.table_name)
    );

    // For now, let's try to query the projects table to see if it exists
    const { data, error } = await supabase
      .from("projects")
      .select("count")
      .limit(1);

    if (error) {
      console.log("❌ Projects table does not exist. Error:", error.message);
      console.log(
        "\n📋 Please manually create the database tables using the SQL in database-setup.sql"
      );
      console.log(
        "🔗 Go to your Supabase dashboard -> SQL Editor and run the SQL script"
      );
    } else {
      console.log("✅ Projects table exists and is accessible");
    }

    console.log("\n🎯 Next steps:");
    console.log("1. Go to https://supabase.com/dashboard");
    console.log("2. Select your project");
    console.log("3. Go to SQL Editor");
    console.log("4. Run the SQL script from database-setup.sql");
    console.log("5. Restart the server");
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

createTables();
