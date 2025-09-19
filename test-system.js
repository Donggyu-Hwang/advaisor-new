#!/usr/bin/env node

const axios = require("axios");

async function testApplication() {
  console.log("🧪 Testing IR Analysis System...\n");

  const baseURL = "http://localhost:3001";
  const tests = [
    {
      name: "Health Check",
      url: `${baseURL}/api/health`,
      method: "GET",
    },
    {
      name: "Database Connection",
      url: `${baseURL}/api/test/db`,
      method: "GET",
    },
    {
      name: "Projects Endpoint (with auth)",
      url: `${baseURL}/api/projects`,
      method: "GET",
      headers: { "user-id": "00000000-0000-0000-0000-000000000000" },
    },
    {
      name: "Projects Endpoint (without auth)",
      url: `${baseURL}/api/projects`,
      method: "GET",
    },
  ];

  for (const test of tests) {
    try {
      const config = {
        method: test.method,
        url: test.url,
        headers: test.headers || {},
        timeout: 5000,
      };

      const response = await axios(config);
      console.log(`✅ ${test.name}: OK (${response.status})`);

      if (test.name === "Health Check") {
        console.log(`   Server uptime: ${response.data.uptime?.toFixed(2)}s`);
      } else if (test.name === "Database Connection") {
        console.log(`   Database: ${response.data.database}`);
        console.log(`   Message: ${response.data.message}`);
      } else if (test.name === "Projects Endpoint (with auth)") {
        console.log(`   Projects found: ${response.data.data?.length || 0}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${test.name}: Failed (${error.response.status})`);
        if (
          test.name === "Projects Endpoint (without auth)" &&
          error.response.status === 401
        ) {
          console.log(`   Expected 401 - authentication working correctly`);
        } else {
          console.log(
            `   Error: ${
              error.response.data?.message || error.response.data?.error
            }`
          );
        }
      } else {
        console.log(`❌ ${test.name}: Connection failed`);
        console.log(`   ${error.message}`);
      }
    }
    console.log("");
  }

  console.log("🌐 Frontend URLs:");
  console.log("   Client: http://localhost:5173");
  console.log("   Server API: http://localhost:3001/api");
  console.log("");

  console.log("📋 Next Steps:");
  console.log("1. Visit http://localhost:5173 to access the application");
  console.log("2. Create an account and log in");
  console.log("3. Upload an IR PDF file to test the analysis");
  console.log("4. Monitor the console for any errors");
}

testApplication().catch(console.error);
