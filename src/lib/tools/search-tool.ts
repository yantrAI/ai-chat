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

  private truncateDescription(description: string, maxLength: number = 300): string {
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength) + "...";
  }

  async func(args: SearchParams): Promise<string> {
    try {
      const results = await search(args.query, {
        safeSearch: "MODERATE",
      });

      if (results.noResults || !results.results.length) {
        return [
          "\n<searching>\n",
          "STATUS: NO_RESULTS",
          `QUERY: "${args.query}"`,
          "MESSAGE: No matching results found",
          "",
          "- Try again later",
          "\n</searching>\n",
        ].join("\n");
      }

      // Take only the requested number of results (max 5 to limit tokens)
      const maxResults = Math.min(args.maxResults, 5);
      const limitedResults = results.results.slice(0, maxResults);

      // Format results with clear sections and spacing
      const formattedResults = limitedResults
        .map((result: SearchResult, index: number) => {
          const title = this.cleanText(result.title);
          const description = this.truncateDescription(this.cleanText(result.description));

          return [
            `[RESULT ${index + 1}]`,
            `TITLE: ${title}`,
            `DESCRIPTION: ${description}`,
            `URL: ${result.url}`,
            "", // Empty line for spacing
          ].join("\n");
        })
        .join("\n");

      return [
        "\n<searching>\n",
        "STATUS: SUCCESS",
        `QUERY: "${args.query}"`,
        `TOTAL_RESULTS: ${results.results.length}`,
        `SHOWING: ${maxResults}`,
        "",
        "RESULTS:",
        formattedResults,
        "",
        "NOTE: Use url_fetch tool to analyze specific URLs in detail",
        "\n</searching>\n",
        "TOOL_CALL_DONE",
        " \n",
      ].join("\n");
    } catch (error) {
      console.error("Search error:", error);
      return [
        "\n<searching>\n",
        "STATUS: ERROR",
        `QUERY: "${args.query}"`,
        `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        "",
        "- Try again later",
        "\n</searching>\n",
      ].join("\n");
    }
  }
}
