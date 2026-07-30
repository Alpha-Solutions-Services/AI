import { createHash } from "crypto";
import { createClient } from "@sanity/client";
import { chunkText, estimateTokens } from "@/lib/alpha/chunk";
import { embedTexts } from "@/lib/alpha/embed";
import {
  getLearnDispatchUrl,
  getPortalUrl,
  getSiteUrl,
  getTmsUrl,
} from "@/lib/supabase/env";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type CrawlSource = {
  source: string;
  url: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  const base = new URL(baseUrl);
  while ((match = re.exec(html))) {
    try {
      const abs = new URL(match[1], base);
      if (abs.origin !== base.origin) continue;
      if (!["http:", "https:"].includes(abs.protocol)) continue;
      abs.hash = "";
      links.add(abs.toString());
    } catch {
      /* ignore */
    }
  }
  return Array.from(links);
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AlphaKnowledgeBot/1.0 (+https://ai.alphasolutions.software)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html") && !ctype.includes("text/plain")) return null;
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch (err) {
    console.warn("[crawl] fetch failed", url, err);
    return null;
  }
}

export function defaultCrawlSeeds(): CrawlSource[] {
  return [
    { source: "marketing", url: getSiteUrl() },
    { source: "marketing", url: `${getSiteUrl().replace(/\/$/, "")}/` },
    { source: "portal", url: getPortalUrl() },
    { source: "tms", url: getTmsUrl() },
    { source: "learndispatch", url: getLearnDispatchUrl() },
  ];
}

async function upsertDocument(input: {
  source: string;
  source_url: string;
  title: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getServiceRoleClient();
  if (!db) throw new Error("Service role required for ingest");

  const checksum = createHash("sha256").update(input.content).digest("hex");
  const { data: doc, error } = await db
    .from("alpha_documents")
    .upsert(
      {
        source: input.source,
        source_url: input.source_url,
        title: input.title,
        content: input.content.slice(0, 200_000),
        metadata: input.metadata ?? {},
        checksum,
        indexed_at: new Date().toISOString(),
      },
      { onConflict: "source,source_url" }
    )
    .select("id")
    .single();

  if (error || !doc) throw error || new Error("document upsert failed");

  await db.from("alpha_chunks").delete().eq("document_id", doc.id);

  const parts = chunkText(input.content);
  if (!parts.length) return { docId: doc.id as string, chunks: 0 };

  const embeddings = await embedTexts(parts);
  const rows = parts.map((content, chunk_index) => ({
    document_id: doc.id,
    chunk_index,
    content,
    token_estimate: estimateTokens(content),
    embedding: embeddings?.[chunk_index] ?? null,
  }));

  const { error: chunkErr } = await db.from("alpha_chunks").insert(rows);
  if (chunkErr) throw chunkErr;

  return { docId: doc.id as string, chunks: rows.length };
}

async function crawlSite(
  seed: CrawlSource,
  maxPages = 12
): Promise<{ docs: number; chunks: number }> {
  const queue = [seed.url];
  const seen = new Set<string>();
  let docs = 0;
  let chunks = 0;
  const origin = new URL(seed.url).origin;

  while (queue.length && seen.size < maxPages) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    const page = await fetchPage(url);
    if (!page) continue;

    const text = stripHtml(page.html);
    if (text.length < 80) continue;

    const title = extractTitle(page.html);
    const result = await upsertDocument({
      source: seed.source,
      source_url: page.finalUrl,
      title,
      content: text,
      metadata: { crawled_from: seed.url },
    });
    docs += 1;
    chunks += result.chunks;

    for (const link of extractLinks(page.html, page.finalUrl)) {
      if (new URL(link).origin !== origin) continue;
      if (!seen.has(link) && queue.length + seen.size < maxPages * 2) {
        queue.push(link);
      }
    }
  }

  return { docs, chunks };
}

async function ingestPortalKnowledge() {
  const db = getServiceRoleClient();
  if (!db) return { docs: 0, chunks: 0 };
  const { data } = await db
    .from("portal_knowledge")
    .select("id, question, answer, category, tags, active")
    .eq("active", true)
    .limit(200);

  let docs = 0;
  let chunks = 0;
  for (const row of data ?? []) {
    const content = `Q: ${row.question}\nA: ${row.answer}`;
    const result = await upsertDocument({
      source: "portal_knowledge",
      source_url: `portal_knowledge:${row.id}`,
      title: row.category || row.question,
      content,
      metadata: { tags: row.tags ?? [] },
    });
    docs += 1;
    chunks += result.chunks;
  }
  return { docs, chunks };
}

async function ingestSanity() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";
  if (!projectId || projectId === "your_sanity_project_id") {
    return { docs: 0, chunks: 0 };
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2024-01-01",
    useCdn: true,
    token: process.env.SANITY_API_READ_TOKEN?.trim() || undefined,
  });

  const docs = await client.fetch<
    { _id: string; _type: string; title?: string; body?: unknown }[]
  >(`*[_type in ["page", "post", "service", "project"]][0...80]{
    _id, _type, title, "body": pt::text(body)
  }`);

  let nDocs = 0;
  let nChunks = 0;
  for (const doc of docs ?? []) {
    const body =
      typeof doc.body === "string"
        ? doc.body
        : JSON.stringify(doc.body ?? "");
    const content = `${doc.title ?? ""}\n${body}`.trim();
    if (content.length < 40) continue;
    const result = await upsertDocument({
      source: "sanity",
      source_url: `sanity:${doc._id}`,
      title: doc.title || doc._type,
      content,
      metadata: { type: doc._type },
    });
    nDocs += 1;
    nChunks += result.chunks;
  }
  return { docs: nDocs, chunks: nChunks };
}

export async function runFullIngest(): Promise<{
  docs: number;
  chunks: number;
  sources: string[];
  error?: string;
}> {
  const db = getServiceRoleClient();
  if (!db) throw new Error("Service role required");

  const { data: run } = await db
    .from("alpha_ingest_runs")
    .insert({ status: "running", sources: [] })
    .select("id")
    .single();

  let docs = 0;
  let chunks = 0;
  const sources: string[] = [];

  try {
    for (const seed of defaultCrawlSeeds()) {
      const r = await crawlSite(seed, 10);
      docs += r.docs;
      chunks += r.chunks;
      sources.push(seed.url);
    }

    const kb = await ingestPortalKnowledge();
    docs += kb.docs;
    chunks += kb.chunks;
    sources.push("portal_knowledge");

    const sanity = await ingestSanity();
    docs += sanity.docs;
    chunks += sanity.chunks;
    if (sanity.docs) sources.push("sanity");

    if (run?.id) {
      await db
        .from("alpha_ingest_runs")
        .update({
          status: "ok",
          docs_upserted: docs,
          chunks_upserted: chunks,
          sources,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }

    return { docs, chunks, sources };
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest failed";
    if (run?.id) {
      await db
        .from("alpha_ingest_runs")
        .update({
          status: "failed",
          error: message,
          docs_upserted: docs,
          chunks_upserted: chunks,
          sources,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    return { docs, chunks, sources, error: message };
  }
}
