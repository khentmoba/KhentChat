import { tool } from "ai";
import { z } from "zod";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const fetchUrlTool = tool({
  description:
    "Fetch and read the content of a specific URL. Use this when the user provides a URL and wants to know what's on the page, or when search results reference a specific page you need to read.",
  execute: async ({ url }) => {
    try {
      const res = await fetch(url, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return {
          content: "",
          error: `HTTP ${res.status}: ${res.statusText}`,
          success: false,
          title: "",
          url,
        };
      }

      const contentType = res.headers.get("content-type") ?? "";
      const html = await res.text();

      let title = "";
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      let content: string;
      if (contentType.includes("text/html")) {
        content = stripHtml(html);
      } else {
        content = html;
      }

      if (content.length > 8000) {
        content = `${content.slice(0, 8000)}\n\n[Content truncated...]`;
      }

      return {
        content,
        contentType,
        success: true,
        title,
        url,
      };
    } catch (error) {
      return {
        content: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
        title: "",
        url,
      };
    }
  },
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch and read"),
  }),
});
