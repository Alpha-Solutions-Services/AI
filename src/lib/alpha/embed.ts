const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 1536);

/** Optional OpenAI-compatible embeddings. Returns null if not configured. */
export async function embedTexts(
  texts: string[]
): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || texts.length === 0) return null;

  const model =
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const base =
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  const res = await fetch(`${base.replace(/\/$/, "")}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    console.error("[embed] failed", await res.text());
    return null;
  }

  const json = (await res.json()) as {
    data?: { embedding: number[]; index: number }[];
  };
  const data = json.data ?? [];
  const sorted = [...data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => {
    const emb = d.embedding;
    if (emb.length === EMBEDDING_DIM) return emb;
    if (emb.length > EMBEDDING_DIM) return emb.slice(0, EMBEDDING_DIM);
    return [...emb, ...Array(EMBEDDING_DIM - emb.length).fill(0)];
  });
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const batch = await embedTexts([text]);
  return batch?.[0] ?? null;
}
