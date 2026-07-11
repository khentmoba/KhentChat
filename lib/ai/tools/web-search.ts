import { tool } from "ai";
import { z } from "zod";

interface SearchResult {
  snippet: string;
  title: string;
  url: string;
}

function extractUrl(rawUrl: string): string {
  const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
  if (uddgMatch) {
    return decodeURIComponent(uddgMatch[1]);
  }
  return rawUrl;
}

function parseResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const blocks = html.split(/class="result results_links/);

  for (let i = 1; i < blocks.length && results.length < 8; i += 1) {
    const block = blocks[i];

    const titleMatch = block.match(
      /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/
    );
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
    );

    if (titleMatch && snippetMatch) {
      const url = extractUrl(titleMatch[1]);
      const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
      const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();

      if (title && url && snippet) {
        results.push({ snippet, title, url });
      }
    }
  }

  return results;
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      kl: "us-en",
      q: query,
    });

    const res = await fetch(
      `https://html.duckduckgo.com/html/?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    return parseResults(html);
  } catch {
    return [];
  }
}

export const searchWebTool = tool({
  description:
    "Search the web for current information. Use this when you need up-to-date facts, news, or information not in your training data.",
  execute: async ({ query }) => {
    const results = await searchDuckDuckGo(query);
    return {
      query,
      resultCount: results.length,
      results,
    };
  },
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
});
