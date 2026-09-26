// Runs before every test file. The suites call dropDatabase(), so refuse to
// start at all unless the configured database is clearly a throwaway one.
const uri = process.env.MONGODB_URI ?? "";
let dbName = "";
try {
  dbName = decodeURIComponent(new URL(uri).pathname.replace(/^\//, ""));
} catch {
  // handled below
}

if (!dbName.endsWith("-test")) {
  throw new Error(
    `Refusing to run tests: database "${dbName || "(none)"}" does not end in "-test". ` +
      "Set TEST_MONGODB_URI to a dedicated test database (tests drop it).",
  );
}
