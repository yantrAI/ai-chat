import { SearchTool } from "./search-tool";
import { URLFetchTool } from "./url-fetch-tool";

async function testToolChain() {
  console.log("Testing tool chain...");

  const searchTool = new SearchTool();
  const urlFetchTool = new URLFetchTool();

  try {
    // Step 1: Search for information
    console.log("\nStep 1: Searching for 'latest react version'");
    const searchResult = await searchTool.call({
      query: "latest react version",
      maxResults: 2,
    });
    console.log("\nSearch Results:");
    console.log(searchResult);

    // Step 2: Fetch content from a relevant URL
    console.log("\nStep 2: Fetching content from react.dev/versions");
    const fetchResult = await urlFetchTool.call({
      url: "https://react.dev/versions",
      selector: "main",
    });
    console.log("\nFetch Results:");
    console.log(fetchResult);
  } catch (error) {
    console.error("Tool chain test failed:", error);
  }
}

// Run the test
testToolChain();
