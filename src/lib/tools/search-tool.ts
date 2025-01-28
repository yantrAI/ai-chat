import { z } from "zod";
import { search, SearchResult } from "duck-duck-scrape";
import { BaseTool } from "./base-tool";

const SearchParameters = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(10).default(3),
});

type SearchParams = z.infer<typeof SearchParameters>;

export class SearchTool extends BaseTool {
  name = "web_search";
  description =
    "Search the web for current information. Returns search results that you can analyze to decide which URLs to fetch using the url_fetch tool.";
  parameters = SearchParameters;

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/&#x27;/g, "'") // Replace HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\b<b>\b/g, "") // Remove standalone <b> tags
      .replace(/\b<\/b>\b/g, ""); // Remove standalone </b> tags
  }

  async func(args: SearchParams): Promise<string> {
    try {
      const results = await search(args.query, {
        safeSearch: "MODERATE",
      });

      if (results.noResults || !results.results.length) {
        return "No results found.";
      }

      // Take only the requested number of results
      const limitedResults = results.results.slice(0, args.maxResults);

      // Format results with clear sections and spacing
      const formattedResults = limitedResults
        .map((result: SearchResult, index: number) => {
          const title = this.cleanText(result.title);
          const description = this.cleanText(result.description);

          return [
            `[Result ${index + 1}]`,
            `Title: ${title}`,
            `Summary: ${description}`,
            `URL: ${result.url}`,
            "Suggestion: If this result seems relevant, you can fetch its full content using the url_fetch tool.",
            "", // Empty line for spacing
          ].join("\n");
        })
        .join("\n");

      return [
        "Search Results:",
        "I found the following results. For each result, I'll indicate if it might be worth fetching the full content.",
        "",
        formattedResults,
        "",
        "Next Steps:",
        "1. Review these results to identify the most relevant URLs",
        "2. Use the url_fetch tool to get detailed content from promising URLs",
        "3. You can fetch multiple URLs if needed to gather comprehensive information",
        "4. For documentation or article pages, try using the 'main' or 'article' selector",
      ].join("\n");
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        `Failed to search: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
