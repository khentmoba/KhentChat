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
    const results: SearchResult[] = [];

    const resultRegex =
      /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    for (const match of html.matchAll(resultRegex)) {
      if (results.length >= 5) {
        break;
      }
      const [, rawUrl, rawTitle, rawSnippet] = match;
      const url = extractUrl(rawUrl);
      const title = rawTitle.replace(/<[^>]+>/g, "").trim();
      const snippet = rawSnippet.replace(/<[^>]+>/g, "").trim();

      if (title && url && snippet) {
        results.push({ snippet, title, url });
      }
    }

    if (results.length === 0) {
      const simpleRegex = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRegex =
        /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      const hrefRegex = /<a[^>]+class="result__a"[^>]+href="([^"]*)"/g;

      const titles: string[] = [];
      const snippets: string[] = [];
      const hrefs: string[] = [];

      for (const m of html.matchAll(simpleRegex)) {
        titles.push(m[1].replace(/<[^>]+>/g, "").trim());
      }
      for (const m of html.matchAll(snippetRegex)) {
        snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
      }
      for (const m of html.matchAll(hrefRegex)) {
        hrefs.push(extractUrl(m[1]));
      }

      const count = Math.min(titles.length, snippets.length, hrefs.length, 5);
      for (let i = 0; i < count; i += 1) {
        const title = titles[i];
        const url = hrefs[i];
        const snippet = snippets[i];
        if (title && url && snippet) {
          results.push({ snippet, title, url });
        }
      }
    }

    return results;
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
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
});
