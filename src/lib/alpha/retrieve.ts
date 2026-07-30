import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { embedQuery } from "@/lib/alpha/embed";

export type RetrievedChunk = {
  id: string;
  content: string;
  source: string;
  source_url: string | null;
  title: string | null;
  rank: number;
};

export async function retrieveKnowledge(
  query: string,
  matchCount = 8
): Promise<RetrievedChunk[]> {
  const db = getServiceRoleClient();
  if (!db || !query.trim()) return [];

  const { data: fts, error } = await db.rpc("alpha_search_chunks", {
    query_text: query.slice(0, 500),
    match_count: matchCount,
  });

  if (error) {
    console.error("[retrieve] fts failed", error);
  }

  const ftsRows = (fts ?? []) as RetrievedChunk[];

  // Optional vector path if embeddings configured and match RPC available later
  const vector = await embedQuery(query);
  if (vector) {
    try {
      const { data: vecRows } = await db.rpc("alpha_match_chunks", {
        query_embedding: vector,
        match_count: matchCount,
      });
      if (Array.isArray(vecRows) && vecRows.length) {
        const map = new Map<string, RetrievedChunk>();
        for (const row of [...(vecRows as RetrievedChunk[]), ...ftsRows]) {
          if (!map.has(row.id)) map.set(row.id, row);
        }
        return Array.from(map.values()).slice(0, matchCount);
      }
    } catch {
      /* alpha_match_chunks optional */
    }
  }

  if (ftsRows.length) return ftsRows;

  // Fallback: portal_knowledge Q&A
  const { data: kb } = await db
    .from("portal_knowledge")
    .select("id, question, answer, category")
    .eq("active", true)
    .limit(40);

  if (!kb?.length) return [];

  const q = query.toLowerCase();
  return kb
    .map((row) => {
      const hay = `${row.question} ${row.answer}`.toLowerCase();
      const rank = hay.includes(q) ? 2 : q.split(/\s+/).filter((w) => hay.includes(w)).length;
      return {
        id: String(row.id),
        content: `Q: ${row.question}\nA: ${row.answer}`,
        source: "portal_knowledge",
        source_url: null,
        title: row.category ?? "Knowledge",
        rank,
      } satisfies RetrievedChunk;
    })
    .filter((r) => r.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, matchCount);
}

export function formatKnowledgeContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "No indexed knowledge matched this query.";
  return chunks
    .map((c, i) => {
      const loc = [c.source, c.title, c.source_url].filter(Boolean).join(" · ");
      return `[${i + 1}] (${loc})\n${c.content}`;
    })
    .join("\n\n");
}
