import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";

/** Canonical Alpha Solutions engineering map (always available offline). */
export const ALPHA_GITHUB_CATALOG = {
  org: "Alpha-Solutions-Services",
  orgUrl: "https://github.com/Alpha-Solutions-Services",
  repos: [
    {
      name: "AI",
      url: "https://github.com/Alpha-Solutions-Services/AI",
      product: "Alpha AI / Universe OS",
      url_live: "https://ai.alphasolutions.software",
    },
    {
      name: "ALPHA-Portal",
      url: "https://github.com/Alpha-Solutions-Services/ALPHA-Portal",
      product: "Client Portal CRM",
      url_live: "https://portal.alphasolutions.software",
    },
    {
      name: "TMS",
      url: "https://github.com/Alpha-Solutions-Services/TMS",
      product: "Alpha Freight Network TMS",
      url_live: "https://tms.alphasolutions.software",
    },
    {
      name: "Learn-Dispatch",
      url: "https://github.com/Alpha-Solutions-Services/Learn-Dispatch",
      product: "Learn Dispatch Academy",
      url_live: "https://learndispatch.alphasolutions.software",
    },
  ],
  notes: [
    "Marketing site lives in the alpha-solutions monorepo / website package and deploys to www.alphasolutions.software",
    "Sanity Studio: studio-alpha-solutions-services-llc (CMS content for site)",
    "Freight Sales portal exists separately; Universe planet disabled until tools ship",
  ],
};

export const githubTools: AlphaTool[] = [
  {
    name: "github_list_alpha_repos",
    description:
      "List Alpha Solutions GitHub org repos and live product URLs. Uses catalog; optionally refreshes via GitHub API if GITHUB_TOKEN is set.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        refresh: {
          type: "boolean",
          description: "If true and GITHUB_TOKEN set, fetch live org repos",
        },
      },
    },
    async execute(args): Promise<ToolResult> {
      const token = process.env.GITHUB_TOKEN?.trim();
      if (args.refresh && token) {
        try {
          const res = await fetch(
            "https://api.github.com/orgs/Alpha-Solutions-Services/repos?per_page=100&sort=updated",
            {
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28",
              },
              signal: AbortSignal.timeout(12_000),
            }
          );
          if (res.ok) {
            const repos = (await res.json()) as Array<{
              name: string;
              html_url: string;
              description: string | null;
              updated_at: string;
              private: boolean;
            }>;
            return {
              ok: true,
              summary: `${repos.length} repos from GitHub API`,
              data: {
                org: ALPHA_GITHUB_CATALOG.org,
                source: "github_api",
                repos: repos.map((r) => ({
                  name: r.name,
                  url: r.html_url,
                  description: r.description,
                  updated_at: r.updated_at,
                  private: r.private,
                })),
                catalog: ALPHA_GITHUB_CATALOG,
              },
            };
          }
        } catch (err) {
          /* fall through to catalog */
        }
      }

      return {
        ok: true,
        summary: `${ALPHA_GITHUB_CATALOG.repos.length} known Alpha repos (catalog)`,
        data: { ...ALPHA_GITHUB_CATALOG, source: "catalog" },
      };
    },
  },
];
