const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "../.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log("Environment check:");
console.log("SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓" : "✗");

async function testDatabaseAccess() {
  // Test with service role
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

  // Test with anon key
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log("\n=== Testing database schema ===");

    // Check if projects table exists and get structure
    const { data: tables, error: tablesError } = await serviceSupabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "projects");

    if (tablesError) {
      console.error("Error checking tables:", tablesError.message);
    } else {
      console.log("Projects table exists:", tables.length > 0);
    }

    // Check columns in projects table
    const { data: columns, error: columnsError } = await serviceSupabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_schema", "public")
      .eq("table_name", "projects");

    if (columnsError) {
      console.error("Error checking columns:", columnsError.message);
    } else {
      console.log("\nProjects table columns:");
      columns.forEach((col) => {
        console.log(
          `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
        );
      });
    }

    console.log("\n=== Testing insert with service role ===");

    // Test insert with service role
    const testProject = {
      user_id: "123e4567-e89b-12d3-a456-426614174000", // dummy UUID
      project_name: "Test Project",
      company_name: "Test Company",
      status: "pending", // Changed from 'uploaded' to 'pending'
    };

    const { data: insertData, error: insertError } = await serviceSupabase
      .from("projects")
      .insert(testProject)
      .select();

    if (insertError) {
      console.error("Service role insert error:", insertError.message);
      console.error("Error details:", insertError);
    } else {
      console.log("Service role insert successful:", insertData);

      // Clean up - delete the test record
      if (insertData && insertData[0]) {
        await serviceSupabase
          .from("projects")
          .delete()
          .eq("id", insertData[0].id);
        console.log("Test record cleaned up");
      }
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testDatabaseAccess();
