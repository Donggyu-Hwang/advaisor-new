const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("❌ Error listing buckets:", error.message);
      return;
    }

    console.log("📂 Available buckets:");
    buckets.forEach((bucket) => {
      console.log(
        `  - ${bucket.name} (${bucket.public ? "public" : "private"})`
      );
    });

    // Test access to ir-files bucket
    const { data, error: testError } = await supabase.storage
      .from("ir-files")
      .list();
    if (testError) {
      console.error("❌ Error accessing ir-files bucket:", testError.message);
    } else {
      console.log("✅ ir-files bucket is accessible");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkBuckets();
