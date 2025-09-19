#!/usr/bin/env node

/**
 * API Endpoint and Database Schema Integrity Check
 *
 * This script checks for common API endpoint mismatches and database schema issues
 * between frontend and backend.
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 API Endpoint and Database Schema Integrity Check\n");

// Frontend API calls check
const frontendApiCalls = [];
const clientDir = path.join(__dirname, "client/src");

function scanForApiCalls(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanForApiCalls(fullPath);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const apiMatches = content.match(/VITE_SERVER_URL}\/api\/[^`"'\s)]+/g);

      if (apiMatches) {
        apiMatches.forEach((match) => {
          const endpoint = match.replace(/.*}\/api/, "/api");
          frontendApiCalls.push({
            file: fullPath.replace(__dirname + "/", ""),
            endpoint,
          });
        });
      }
    }
  }
}

// Backend routes check
const backendRoutes = [];
const serverRoutesDir = path.join(__dirname, "server/src/routes");

function scanBackendRoutes(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.endsWith(".ts")) {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      const routePrefix = file.replace(".ts", "");

      // Extract route definitions
      const routeMatches = content.match(
        /\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g
      );

      if (routeMatches) {
        routeMatches.forEach((match) => {
          const methodMatch = match.match(/\.(get|post|put|delete|patch)/);
          const pathMatch = match.match(/["']([^"']+)["']/);

          if (methodMatch && pathMatch) {
            const method = methodMatch[1].toUpperCase();
            const path = pathMatch[1];
            const fullPath = `/api/${routePrefix}${path === "/" ? "" : path}`;

            backendRoutes.push({
              file: `server/src/routes/${file}`,
              method,
              endpoint: fullPath,
            });
          }
        });
      }
    }
  }
}

// Database schema check
function checkDatabaseSchema() {
  const schemaFile = path.join(__dirname, "database-setup.sql");
  const content = fs.readFileSync(schemaFile, "utf-8");

  const tables = [];
  const tableMatches = content.match(/CREATE TABLE[^(]+\(([^;]+);/gs);

  if (tableMatches) {
    tableMatches.forEach((match) => {
      const tableNameMatch = match.match(
        /CREATE TABLE[^"']*["']?([^"'\s(]+)["']?\s*\(/
      );
      if (tableNameMatch) {
        tables.push(tableNameMatch[1].replace("public.", ""));
      }
    });
  }

  return tables;
}

try {
  // Scan frontend
  if (fs.existsSync(clientDir)) {
    scanForApiCalls(clientDir);
  }

  // Scan backend
  if (fs.existsSync(serverRoutesDir)) {
    scanBackendRoutes(serverRoutesDir);
  }

  // Check database schema
  const dbTables = checkDatabaseSchema();

  console.log("📱 Frontend API Calls:");
  frontendApiCalls.forEach((call) => {
    console.log(`  ${call.endpoint} (${call.file})`);
  });

  console.log("\n🔧 Backend API Routes:");
  backendRoutes.forEach((route) => {
    console.log(`  ${route.method} ${route.endpoint} (${route.file})`);
  });

  console.log("\n💾 Database Tables:");
  dbTables.forEach((table) => {
    console.log(`  ${table}`);
  });

  // Check for mismatches
  console.log("\n🔍 API Endpoint Analysis:");

  const frontendEndpoints = frontendApiCalls.map((call) =>
    call.endpoint.replace(/\/[^/]*$/, (match) => {
      // Replace parameters like /:id with placeholder
      if (match.includes("${") || match.includes("`")) {
        return "/:param";
      }
      return match;
    })
  );

  const backendEndpoints = backendRoutes.map((route) => route.endpoint);

  const missingEndpoints = [];
  frontendApiCalls.forEach((call) => {
    const endpoint = call.endpoint;
    const matches = backendRoutes.some((route) => {
      // Check exact match or parameter match
      if (route.endpoint === endpoint) return true;

      // Check parameter-based matches
      const routePattern = route.endpoint.replace(/:\w+/g, "[^/]+");
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(endpoint);
    });

    if (!matches) {
      missingEndpoints.push(call);
    }
  });

  if (missingEndpoints.length > 0) {
    console.log("❌ Missing Backend Endpoints:");
    missingEndpoints.forEach((missing) => {
      console.log(`  ${missing.endpoint} (called from ${missing.file})`);
    });
  } else {
    console.log(
      "✅ All frontend API calls have corresponding backend endpoints"
    );
  }

  // Check for required database tables
  const requiredTables = [
    "projects",
    "project_pages",
    "analysis_results",
    "final_reports",
  ];
  const missingTables = requiredTables.filter(
    (table) => !dbTables.includes(table)
  );

  if (missingTables.length > 0) {
    console.log("\n❌ Missing Database Tables:");
    missingTables.forEach((table) => {
      console.log(`  ${table}`);
    });
    console.log("\n💡 Run migration-fix-schema.sql to fix missing tables");
  } else {
    console.log("\n✅ All required database tables are present");
  }

  console.log("\n📋 Summary:");
  console.log(`  Frontend API calls: ${frontendApiCalls.length}`);
  console.log(`  Backend routes: ${backendRoutes.length}`);
  console.log(`  Database tables: ${dbTables.length}`);
  console.log(`  Missing endpoints: ${missingEndpoints.length}`);
  console.log(`  Missing tables: ${missingTables.length}`);

  if (missingEndpoints.length === 0 && missingTables.length === 0) {
    console.log(
      "\n🎉 All API endpoints and database schema appear to be consistent!"
    );
  }
} catch (error) {
  console.error("❌ Error during integrity check:", error.message);
  process.exit(1);
}
