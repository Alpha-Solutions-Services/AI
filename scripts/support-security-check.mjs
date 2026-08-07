/**
 * Security smoke checks for Support Agent public API.
 * Run against a live AI host after env keys are set:
 *   node scripts/support-security-check.mjs [baseUrl]
 *
 * Expects: random Origin + missing/wrong key → 403
 */
const base = (process.argv[2] || "https://ai.alphasolutions.software").replace(
  /\/$/,
  ""
);

async function check(name, init) {
  const res = await fetch(`${base}/api/support/session`, init);
  const body = await res.json().catch(() => ({}));
  return { name, status: res.status, error: body.error || null };
}

async function main() {
  const results = [];

  results.push(
    await check("reject_bad_origin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        "x-support-site-key": "wrong",
      },
      body: JSON.stringify({
        site: "afn",
        visitorToken: "0123456789abcdef0123456789abcdef",
      }),
    })
  );

  results.push(
    await check("reject_missing_key_afn_origin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://afn.alphasolutions.software",
      },
      body: JSON.stringify({
        site: "afn",
        visitorToken: "0123456789abcdef0123456789abcdef",
      }),
    })
  );

  results.push(
    await check("reject_wrong_key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://afn.alphasolutions.software",
        "x-support-site-key": "not-the-real-key",
      },
      body: JSON.stringify({
        site: "afn",
        visitorToken: "0123456789abcdef0123456789abcdef",
      }),
    })
  );

  let failed = 0;
  let notDeployed = 0;
  for (const r of results) {
    if (r.status === 404) {
      notDeployed += 1;
      console.log(`SKIP ${r.name} → 404 (route not deployed yet)`);
      continue;
    }
    const ok = r.status === 403;
    if (!ok) failed += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${r.name} → ${r.status} ${r.error || ""}`);
  }

  if (notDeployed === results.length) {
    console.log(
      "\nAll checks skipped — deploy AI app with /api/support/* then re-run."
    );
    process.exit(0);
  }

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll security rejection checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
