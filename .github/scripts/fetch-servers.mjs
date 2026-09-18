import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "..", "src", "data", "servers.json");

const BESZEL_URL = process.env.BESZEL_URL || "https://example.invalid";
const BESZEL_EMAIL = process.env.BESZEL_EMAIL;
const BESZEL_PASSWORD = process.env.BESZEL_PASSWORD;
const CI_BYPASS_SECRET = process.env.CI_BYPASS_SECRET;
const HISTORY_POINTS = 24;

if (!BESZEL_EMAIL || !BESZEL_PASSWORD) {
  console.error("Missing BESZEL_EMAIL / BESZEL_PASSWORD env vars");
  process.exit(1);
}

const bypassHeaders = CI_BYPASS_SECRET ? { "X-CI-Bypass": CI_BYPASS_SECRET } : {};

async function authenticate() {
  const res = await fetch(`${BESZEL_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bypassHeaders },
    body: JSON.stringify({ identity: BESZEL_EMAIL, password: BESZEL_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Beszel auth failed: ${res.status}`);
  const json = await res.json();
  return json.token;
}

async function fetchSystems(token) {
  const res = await fetch(`${BESZEL_URL}/api/collections/systems/records?perPage=50`, {
    headers: { Authorization: token, ...bypassHeaders },
  });
  if (!res.ok) throw new Error(`Beszel systems fetch failed: ${res.status}`);
  const json = await res.json();
  return json.items || [];
}

async function fetchHistory(token, systemId) {
  const filter = encodeURIComponent(`system='${systemId}' && type='10m'`);
  const res = await fetch(
    `${BESZEL_URL}/api/collections/system_stats/records?perPage=${HISTORY_POINTS}&sort=-created&filter=${filter}`,
    { headers: { Authorization: token, ...bypassHeaders } },
  );
  if (!res.ok) throw new Error(`Beszel stats fetch failed for ${systemId}: ${res.status}`);
  const json = await res.json();
  return (json.items || []).reverse().map((item) => ({
    at: item.created,
    cpu: item.stats?.cpu ?? null,
    mem: item.stats?.mp ?? null,
    disk: item.stats?.dp ?? null,
  }));
}

const token = await authenticate();
const systems = await fetchSystems(token);

const results = await Promise.all(
  systems.map(async (system) => {
    const history = await fetchHistory(token, system.id);
    return {
      id: system.id,
      name: system.name,
      status: system.status,
      cpu: system.info?.cpu ?? null,
      mem: system.info?.mp ?? null,
      disk: system.info?.dp ?? null,
      updated: system.updated,
      history,
    };
  }),
);

const data = {
  updatedAt: new Date().toISOString(),
  systems: results,
};

writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${results.length} systems to ${outPath}`);
