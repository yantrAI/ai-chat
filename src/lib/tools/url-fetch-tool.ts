import { z } from "zod";
import { BaseTool } from "./base-tool";
import needle from "needle";
import { load } from "cheerio";

const URLParameters = z.object({
  url: z.string().url(),
  selector: z.string().optional().default("main"), // Default to main content area
});

type URLParams = z.infer<typeof URLParameters>;

export class URLFetchTool extends BaseTool {
  name = "url_fetch";
  description =
    "Fetch and extract content from a specific URL. Defaults to extracting the main content area. Common selectors: 'main' for main content, 'article' for articles, '.content' for content divs.";
  parameters = URLParameters;

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
      .replace(/&#x27;/g, "'") // Replace HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  }

  private truncateContent(content: string, maxLength: number = 4000): string {
    if (content.length <= maxLength) return content;
    
    // Take first 2000 chars and last 2000 chars if exceeding limit
    const halfLength = Math.floor(maxLength / 2);
    const firstHalf = content.slice(0, halfLength);
    const secondHalf = content.slice(-halfLength);
    
    return `${firstHalf}\n...[${content.length - maxLength} characters truncated]...\n${secondHalf}`;
  }

  async func(args: URLParams): Promise<string> {
    try {
      // Fetch the webpage
      const response = await needle("get", args.url, {
        follow_max: 5, // Allow up to 5 redirects
        response_timeout: 10000, // 10 seconds timeout
        compressed: true,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; URLFetchBot/1.0)",
        },
      });

      if (response.statusCode !== 200) {
        throw new Error(
          `Failed to fetch URL: ${response.statusCode} ${response.statusMessage}`
        );
      }

      // Load the HTML content
      const $ = load(response.body);

      // Remove unwanted elements
      $("script").remove();
      $("style").remove();
      $("noscript").remove();
      $("iframe").remove();
      $("img").remove();
      $("svg").remove();
      $("nav").remove();
      $("footer").remove();
      $("header").remove();
      $("[role='banner']").remove();
      $("[role='navigation']").remove();
      $("[role='complementary']").remove();

      // Get page title
      const pageTitle = $("title").text().trim();

      // Extract content from the specified selector
      const content = $(args.selector)
        .map((_, el) => $(el).text())
        .get()
        .join("\n");

      if (!content.trim()) {
        // Try alternative selectors if the specified one yields no content
        const alternativeSelectors = [
          "article",
          ".content",
          "#content",
          ".main",
          "#main",
        ];
        for (const altSelector of alternativeSelectors) {
          const altContent = $(altSelector)
            .map((_, el) => $(el).text())
            .get()
            .join("\n");
          if (altContent.trim()) {
            return [
              `\n<fetching ${args.url} >\n`,
              "STATUS: SUCCESS_WITH_ALT_SELECTOR",
              `TITLE: ${pageTitle}`,
              `ORIGINAL_SELECTOR: ${args.selector}`,
              `USED_SELECTOR: ${altSelector}`,
              "",
              "CONTENT:",
              this.truncateContent(this.cleanText(altContent)),
              "</fetching>\n",
              "TOOL_CALL_DONE",
              "\n",
            ].join("\n");
          }
        }
        return [
          `\n<fetching ${args.url} >\n`,
          "STATUS: NO_CONTENT",
          `ATTEMPTED_SELECTOR: ${args.selector}`,
          "MESSAGE: No content found with specified or alternative selectors",
          "",
          "- Try again",
          "</fetching>\n",
        ].join("\n");
      }

      const cleanedContent = this.cleanText(content);

      return [
        `\n<fetching ${args.url} >\n`,
        "STATUS: SUCCESS",
        `TITLE: ${pageTitle}`,
        `SELECTOR: ${args.selector}`,
        "",
        "CONTENT:",
        this.truncateContent(cleanedContent),
        "</fetching>\n",
        "TOOL_CALL_DONE",
        "\n",
      ].join("\n");
    } catch (error) {
      console.error("URL fetch error:", error);
      return [
        `\n<fetching ${args.url} >\n`,
        "STATUS: ERROR",
        `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        "",
        "- Try again later",
        "</fetching>\n",
      ].join("\n");
    }
  }
}
