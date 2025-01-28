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
              `URL: ${args.url}`,
              `Title: ${pageTitle}`,
              `Note: No content found with selector "${args.selector}", using "${altSelector}" instead.`,
              "Content:",
              this.cleanText(altContent).slice(0, 2000),
              "",
              "Next Steps:",
              "1. Review this content to find the information you need",
              "2. If the content is not what you expected, try a different selector",
              "3. You can search for more URLs if needed",
              altContent.length > 2000 ? "\n[Content truncated...]" : "",
            ].join("\n");
          }
        }
        return `No content found at ${args.url} with selector "${args.selector}" or common alternative selectors.`;
      }

      const cleanedContent = this.cleanText(content);
      const truncatedContent = cleanedContent.slice(0, 2000); // Limit content length

      return [
        `URL: ${args.url}`,
        `Title: ${pageTitle}`,
        `Selector: ${args.selector}`,
        "Content:",
        truncatedContent,
        "",
        "Next Steps:",
        "1. Review this content to find the information you need",
        "2. If the content is not what you expected, try a different selector",
        "3. You can search for more URLs if needed",
        truncatedContent.length < cleanedContent.length
          ? "\n[Content truncated...]"
          : "",
      ].join("\n");
    } catch (error) {
      console.error("URL fetch error:", error);
      throw new Error(
        `Failed to fetch content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
