import { SearchTool } from "./search-tool";

async function testSearch() {
  console.log("Testing search tool...");

  const searchTool = new SearchTool();

  try {
    console.log("Testing with query: 'latest react version'");
    const result = await searchTool.call({
      query: "latest react version",
      maxResults: 3,
    });

    console.log("\nSearch Results:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Search test failed:", error);
  }
}

// Run the test
testSearch();
