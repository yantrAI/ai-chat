import { URLFetchTool } from "./url-fetch-tool";

async function testURLFetch() {
  console.log("Testing URL fetch tool...");

  const urlFetchTool = new URLFetchTool();

  try {
    console.log("Testing with URL: 'https://react.dev/versions'");
    const result = await urlFetchTool.call({
      url: "https://react.dev/versions",
      selector: "main", // Target main content area
    });

    console.log("\nFetch Results:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("URL fetch test failed:", error);
  }
}

// Run the test
testURLFetch();
