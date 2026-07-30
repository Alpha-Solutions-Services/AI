import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";

async function tavilySearch(query: string): Promise<ToolResult | null> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: true,
    }),
  });
  if (!res.ok) {
    return {
      ok: false,
      summary: "Tavily search failed",
      error: await res.text(),
    };
  }
  const json = (await res.json()) as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string }[];
  };
  return {
    ok: true,
    summary: json.answer || `Found ${json.results?.length ?? 0} web results`,
    data: json,
  };
}

async function duckDuckGoSearch(query: string): Promise<ToolResult> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return { ok: false, summary: "Web search failed", error: `HTTP ${res.status}` };
  }
  const json = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    Answer?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };

  const related = (json.RelatedTopics || [])
    .filter((t) => t.Text)
    .slice(0, 6)
    .map((t) => ({ title: t.Text, url: t.FirstURL }));

  const summary =
    json.Answer ||
    json.AbstractText ||
    (related[0]?.title ? related[0].title : `No direct abstract for “${query}”`);

  return {
    ok: true,
    summary,
    data: {
      heading: json.Heading,
      abstract: json.AbstractText,
      abstractUrl: json.AbstractURL,
      answer: json.Answer,
      related,
      provider: "duckduckgo",
    },
  };
}

/** Fetch a public URL and return readable text excerpt (internet browse). */
async function fetchUrl(url: string): Promise<ToolResult> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, summary: "Only http(s) URLs allowed", error: "bad_protocol" };
    }
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "AlphaWebTool/1.0 (+https://ai.alphasolutions.software)",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { ok: false, summary: `Fetch failed (${res.status})`, error: String(res.status) };
    }
    const ctype = res.headers.get("content-type") || "";
    const raw = await res.text();
    let text = raw;
    if (ctype.includes("html")) {
      text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return {
      ok: true,
      summary: `Fetched ${parsed.hostname} (${Math.min(text.length, 8000)} chars)`,
      data: {
        url: res.url,
        contentType: ctype,
        excerpt: text.slice(0, 8000),
      },
    };
  } catch (err) {
    return {
      ok: false,
      summary: "URL fetch failed",
      error: err instanceof Error ? err.message : "fetch_error",
    };
  }
}

export const webTools: AlphaTool[] = [
  {
    name: "web_search",
    description:
      "Search the public internet for current information, news, docs, or facts outside Alpha Solutions systems.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    async execute(args): Promise<ToolResult> {
      const query = String(args.query || "").trim();
      if (!query) return { ok: false, summary: "Empty query", error: "empty" };
      const tavily = await tavilySearch(query);
      if (tavily) return tavily;
      return duckDuckGoSearch(query);
    },
  },
  {
    name: "web_fetch",
    description:
      "Fetch and read a public web page or JSON URL for Alpha to summarize.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
    async execute(args): Promise<ToolResult> {
      return fetchUrl(String(args.url || ""));
    },
  },
];
