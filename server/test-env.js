require("dotenv").config({ path: "../.env" });

console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "Set" : "Not set");
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"
);
console.log("Current working directory:", process.cwd());
