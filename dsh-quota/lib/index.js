// src/shared.ts
var PROVIDER_ID = "midea";
var API_PREFIX = "/api/company-quota";
function localDateKey(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// src/balance.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
var FORMAT_VERSION = 1;
var KEEP_DAYS = 120;
var store;
var loading;
var writing = Promise.resolve();
function storePath() {
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "company-quota", "balance-days.json");
}
async function ensureLoaded() {
  if (store !== void 0) return;
  if (loading === void 0) {
    loading = (async () => {
      const days = /* @__PURE__ */ new Map();
      try {
        const raw = await readFile(storePath(), "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.version === FORMAT_VERSION && parsed.days !== null && typeof parsed.days === "object") {
          for (const [date, entry] of Object.entries(parsed.days)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
            if (typeof entry?.total !== "number" || typeof entry?.remaining !== "number") continue;
            days.set(date, { at: entry.at ?? 0, total: entry.total, remaining: entry.remaining });
          }
        }
      } catch {
      }
      store = days;
    })();
  }
  await loading;
}
function persist() {
  const days = store;
  if (days === void 0) return Promise.resolve();
  const cutoff = localDateKey(Date.now() - KEEP_DAYS * 864e5);
  for (const date of days.keys()) if (date < cutoff) days.delete(date);
  const payload = { version: FORMAT_VERSION, days: Object.fromEntries([...days.entries()].sort()) };
  writing = writing.then(async () => {
    const path = storePath();
    try {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      await writeFile(tmp, JSON.stringify(payload), "utf8");
      await rename(tmp, path);
    } catch {
    }
  });
  return writing;
}
async function recordBalance(quota, nowMs) {
  await ensureLoaded();
  const days = store;
  if (days === void 0) return;
  const key = localDateKey(nowMs);
  const previous = days.get(key);
  if (previous !== void 0 && previous.total === quota.total && previous.remaining === quota.remaining) return;
  days.set(key, { at: nowMs, total: quota.total, remaining: quota.remaining });
  await persist();
}
async function dailySpend(nowMs) {
  await ensureLoaded();
  const days = store;
  if (days === void 0) return [];
  const cutoff = localDateKey(nowMs - KEEP_DAYS * 864e5);
  const entries = [...days.entries()].filter(([date]) => date >= cutoff).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const rows = [];
  for (let index = 1; index < entries.length; index += 1) {
    const [date, current] = entries[index];
    const previous = entries[index - 1][1];
    const spent = previous.remaining - current.remaining;
    rows.push({ date, cost: spent > 0 ? Math.round(spent * 1e6) / 1e6 : 0, tokens: 0 });
  }
  return rows;
}
async function firstSnapshotDate() {
  await ensureLoaded();
  const days = store;
  if (days === void 0) return void 0;
  let first;
  for (const date of days.keys()) if (first === void 0 || date < first) first = date;
  return first;
}

// src/legacy.ts
import { readFile as readFile2, stat } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
var PRICES = {
  "glm-5.3-flash-aliyun": [0.4, 1.4, 0.12],
  "qwen3.8-flash-aliyun": [0.8, 2.7, 0.1],
  "qwen3.7-plus-aliyun": [1.28, 5.12, 0.26],
  "deepseek-v4-flash-deepseek": [2, 8, 0.04],
  "deepseek-v4-flash-vision-exp-deepseek": [2, 8, 0.04],
  "glm-5.2-aliyun": [4, 14, 1],
  "qwen3.7-max-aliyun": [6, 18, 2],
  "deepseek-v4-pro-deepseek": [9, 27, 0.3],
  "qwen3.8-max-aliyun": [12, 36, 1.5],
  "kimi-k3-aliyun": [20, 100, 2]
};
var cache;
function ledgerPath() {
  return join2(process.env.DSH_HOME ?? join2(homedir2(), ".dsh"), "dsh-usage", "usage-ledger.json");
}
function modelCost(model, totals) {
  const key = model.slice(model.lastIndexOf("/") + 1);
  const price = PRICES[key];
  if (price === void 0) return 0;
  const input = totals.inputTokens ?? 0;
  const output = totals.outputTokens ?? 0;
  const cached = totals.cacheReadTokens ?? 0;
  return (input * price[0] + output * price[1] + cached * price[2]) / 1e6;
}
function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}
function foldLedger(raw, routeIds) {
  const days = /* @__PURE__ */ new Map();
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return days;
  }
  for (const [date, buckets] of Object.entries(doc.days ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || buckets === null || typeof buckets !== "object") continue;
    let cost = 0;
    for (const id of routeIds) {
      const models = buckets[id];
      if (models === void 0 || models === null || typeof models !== "object") continue;
      for (const [model, totals] of Object.entries(models)) {
        if (totals === null || typeof totals !== "object") continue;
        cost += modelCost(model, totals);
      }
    }
    days.set(date, round6(cost));
  }
  return days;
}
async function loadLedger(routeIds) {
  const path = ledgerPath();
  let fingerprint;
  try {
    const info = await stat(path);
    fingerprint = `${info.size}:${info.mtimeMs}`;
  } catch {
    return /* @__PURE__ */ new Map();
  }
  const cached = cache;
  if (cached !== void 0 && cached.key === fingerprint) {
    return cached.days;
  }
  try {
    const raw = await readFile2(path, "utf8");
    const days = foldLedger(raw, routeIds);
    cache = { key: fingerprint, days };
    return days;
  } catch {
    return /* @__PURE__ */ new Map();
  }
}
async function legacyDaily(routeIds, beforeDate) {
  const days = await loadLedger(routeIds);
  const rows = [];
  for (const [date, cost] of days) {
    if (date >= beforeDate) continue;
    rows.push({ date, cost, tokens: 0 });
  }
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  return rows;
}

// src/tokens.ts
import { mkdir as mkdir2, readdir, readFile as readFile3, rename as rename2, stat as stat2, writeFile as writeFile2 } from "node:fs/promises";
import { homedir as homedir3 } from "node:os";
import { dirname as dirname2, join as join3 } from "node:path";
import { zstdDecompress } from "node:zlib";
var CACHE_VERSION = 1;
var DEFAULT_WINDOW_DAYS = 120;
var RESCAN_MS = 3e4;
var FILES_IN_FLIGHT = 3;
var ZSTD_MAGIC = Buffer.from([40, 181, 47, 253]);
var LOG_FILE_PATTERN = /^session\.v\d+\.jsonl\.zstd$/;
var memory;
var loading2;
var refreshing;
function dshHome() {
  return process.env.DSH_HOME ?? join3(homedir3(), ".dsh");
}
function cachePath() {
  return join3(dshHome(), "company-quota", "token-cache.json");
}
function sessionsRoot() {
  return join3(dshHome(), "sessions");
}
function windowDays() {
  const raw = Number(process.env.COMPANY_USAGE_WINDOW_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_WINDOW_DAYS;
}
function emptyTotals() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 };
}
function addUsage(target, usage) {
  const read = (key) => {
    const value = usage[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
  };
  target.inputTokens += read("inputTokens");
  target.outputTokens += read("outputTokens");
  target.cacheReadTokens += read("cacheReadTokens");
  target.cacheWriteTokens += read("cacheWriteTokens");
  target.calls += 1;
}
async function listLogs() {
  const root = sessionsRoot();
  const logs = [];
  let workspaces;
  try {
    workspaces = await readdir(root, { withFileTypes: true });
  } catch {
    return logs;
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue;
    const workspaceDir = join3(root, workspace.name);
    let sessions;
    try {
      sessions = await readdir(workspaceDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue;
      const sessionDir = join3(workspaceDir, session.name);
      let files;
      try {
        files = await readdir(sessionDir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!LOG_FILE_PATTERN.test(file)) continue;
        const path = join3(sessionDir, file);
        try {
          const info = await stat2(path);
          logs.push({ path, size: info.size, mtimeMs: info.mtimeMs });
        } catch {
        }
      }
    }
  }
  return logs;
}
async function decodeLog(bytes) {
  const starts = [];
  let index = bytes.indexOf(ZSTD_MAGIC, 0);
  while (index >= 0) {
    starts.push(index);
    index = bytes.indexOf(ZSTD_MAGIC, index + ZSTD_MAGIC.length);
  }
  if (starts.length === 0) return "";
  starts.push(bytes.length);
  const chunks = [];
  for (let frame = 0; frame < starts.length - 1; frame += 1) {
    const slice = bytes.subarray(starts[frame], starts[frame + 1]);
    if (slice.length === 0) continue;
    try {
      chunks.push(await new Promise((resolve, reject) => {
        zstdDecompress(slice, (error, result) => {
          if (error !== null) reject(error);
          else resolve(result);
        });
      }));
    } catch {
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}
function foldLog(text) {
  const days = {};
  let provider;
  let model;
  for (const line of text.split("\n")) {
    if (line === "") continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const data = row.data;
    if (typeof data !== "object" || data === null) continue;
    const record = data;
    if (row.type === "request/header") {
      const header = record.header;
      const config = typeof header === "object" && header !== null ? header.config : void 0;
      const next = typeof config === "object" && config !== null ? config : {};
      if (typeof next.provider === "string" && typeof next.model === "string") {
        provider = next.provider;
        model = next.model;
      }
      continue;
    }
    if (row.type === "request/context") {
      if (typeof record.provider === "string" && typeof record.model === "string") {
        provider = record.provider;
        model = record.model;
      }
      continue;
    }
    if (row.type !== "assistant/message") continue;
    const usage = record.usage;
    if (typeof usage !== "object" || usage === null) continue;
    if (provider === void 0 || model === void 0) continue;
    const time = typeof row.time === "number" ? row.time : void 0;
    if (time === void 0) continue;
    const date = localDateKey(time);
    const byRoute = days[date] ?? (days[date] = {});
    const byModel = byRoute[provider] ?? (byRoute[provider] = {});
    const totals = byModel[model] ?? (byModel[model] = emptyTotals());
    addUsage(totals, usage);
  }
  return days;
}
async function loadCache() {
  const empty = { scannedAt: 0, windowDays: windowDays(), files: /* @__PURE__ */ new Map() };
  let raw;
  try {
    raw = await readFile3(cachePath(), "utf8");
  } catch {
    return empty;
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (doc.version !== CACHE_VERSION || typeof doc.files !== "object" || doc.files === null) return empty;
  const files = /* @__PURE__ */ new Map();
  for (const [path, fold] of Object.entries(doc.files)) {
    if (typeof fold?.size !== "number" || typeof fold?.mtimeMs !== "number" || typeof fold.days !== "object") continue;
    files.set(path, fold);
  }
  return {
    scannedAt: typeof doc.scannedAt === "number" ? doc.scannedAt : 0,
    windowDays: typeof doc.windowDays === "number" ? doc.windowDays : windowDays(),
    files
  };
}
async function saveCache(cache2) {
  const files = {};
  for (const [path, fold] of cache2.files) files[path] = fold;
  const doc = {
    version: CACHE_VERSION,
    scannedAt: cache2.scannedAt,
    windowDays: cache2.windowDays,
    files
  };
  const target = cachePath();
  const temporary = `${target}.tmp`;
  try {
    await mkdir2(dirname2(target), { recursive: true });
    await writeFile2(temporary, JSON.stringify(doc), "utf8");
    await rename2(temporary, target);
  } catch {
  }
}
function ensureLoaded2() {
  if (memory !== void 0) return Promise.resolve(memory);
  loading2 ??= loadCache().then((cache2) => {
    memory ??= cache2;
    loading2 = void 0;
    return memory;
  });
  return loading2;
}
async function scanOnce(routeIds) {
  void routeIds;
  const cache2 = await ensureLoaded2();
  const days = cache2.windowDays;
  const cutoff = Date.now() - days * 864e5;
  const logs = await listLogs();
  const present = /* @__PURE__ */ new Set();
  const pending = [];
  for (const log of logs) {
    if (log.mtimeMs < cutoff) continue;
    present.add(log.path);
    const cached = cache2.files.get(log.path);
    if (cached !== void 0 && cached.size === log.size && cached.mtimeMs === log.mtimeMs) continue;
    pending.push(log);
  }
  for (const path of [...cache2.files.keys()]) {
    if (!present.has(path)) cache2.files.delete(path);
  }
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const log = pending[cursor];
      cursor += 1;
      if (log === void 0) return;
      let bytes;
      try {
        bytes = await readFile3(log.path);
      } catch {
        continue;
      }
      const text = await decodeLog(bytes);
      cache2.files.set(log.path, { size: log.size, mtimeMs: log.mtimeMs, days: foldLog(text) });
    }
  };
  await Promise.all(Array.from({ length: Math.min(FILES_IN_FLIGHT, pending.length) }, worker));
  cache2.scannedAt = Date.now();
  cache2.windowDays = days;
  await saveCache(cache2);
}
function refresh(routeIds) {
  refreshing ??= scanOnce(routeIds).catch(() => {
  }).finally(() => {
    refreshing = void 0;
  });
  return refreshing;
}
function aggregate(cache2, routeIds) {
  const usage = /* @__PURE__ */ new Map();
  for (const fold of cache2.files.values()) {
    for (const [date, byRoute] of Object.entries(fold.days)) {
      for (const [provider, byModel] of Object.entries(byRoute)) {
        if (!routeIds.has(provider)) continue;
        let models = usage.get(date);
        if (models === void 0) {
          models = /* @__PURE__ */ new Map();
          usage.set(date, models);
        }
        for (const [model, totals] of Object.entries(byModel)) {
          const target = models.get(model) ?? emptyTotals();
          target.inputTokens += totals.inputTokens;
          target.outputTokens += totals.outputTokens;
          target.cacheReadTokens += totals.cacheReadTokens;
          target.cacheWriteTokens += totals.cacheWriteTokens;
          target.calls += totals.calls;
          models.set(model, target);
        }
      }
    }
  }
  return usage;
}
function toDayTokens(usage) {
  const days = /* @__PURE__ */ new Map();
  for (const [date, models] of usage) {
    const day = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      calls: 0,
      totalTokens: 0
    };
    for (const totals of models.values()) {
      day.inputTokens += totals.inputTokens;
      day.outputTokens += totals.outputTokens;
      day.cacheReadTokens += totals.cacheReadTokens;
      day.cacheWriteTokens += totals.cacheWriteTokens;
      day.calls += totals.calls;
    }
    day.totalTokens = day.inputTokens + day.cacheReadTokens + day.outputTokens;
    days.set(date, day);
  }
  return days;
}
async function collectTokens(ctx, routeIds) {
  void ctx;
  const cache2 = await ensureLoaded2();
  const stale = Date.now() - cache2.scannedAt >= RESCAN_MS;
  if (cache2.scannedAt === 0) {
    await refresh(routeIds);
  } else if (stale) {
    void refresh(routeIds);
  }
  return toDayTokens(aggregate(await ensureLoaded2(), routeIds));
}
async function warmTokens(routeIds) {
  await ensureLoaded2();
  await refresh(routeIds);
}

// src/index.ts
var name = "company-quota";
var inject = ["webServer"];
var MIP_USER_ID = process.env.MIP_USER_ID ?? "wuxw32";
var QUOTA_URL = `https://ai.meicloud.com/token-kanban/api/v1/openapi/member-quota?user_id=${encodeURIComponent(MIP_USER_ID)}`;
var COMPANY_URL_PREFIX = process.env.COMPANY_URL_PREFIX ?? "https://ai.meicloud.com/";
var API_KEY_REF = "MIDEA_API_KEY";
var CACHE_MS = 6e4;
var ROUTES_CACHE_MS = 6e4;
var TIMEOUT_MS = 25e3;
var SAMPLE_MS = 15 * 6e4;
var quotaCache;
var quotaInflight;
var routesCache;
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unwrapVolatile(value) {
  if (!isPlainObject(value)) return value;
  if (typeof value.get === "function") {
    try {
      return unwrapVolatile(value.get());
    } catch {
      return value;
    }
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) result[key] = unwrapVolatile(entry);
  return result;
}
function serviceOf(ctx, serviceName) {
  try {
    const get = ctx.get;
    return typeof get === "function" ? get.call(ctx, serviceName) : void 0;
  } catch {
    return void 0;
  }
}
function providersFromDescribe(ctx) {
  const settings = serviceOf(ctx, "settings");
  if (settings === void 0 || typeof settings.describe !== "function") return void 0;
  try {
    const descriptors = settings.describe({ redactSecrets: false });
    if (!Array.isArray(descriptors)) return void 0;
    for (const descriptor of descriptors) {
      if (!isPlainObject(descriptor)) continue;
      if (descriptor.ns !== "llm-pi-ai" && descriptor.ns !== "llm") continue;
      const value = unwrapVolatile(descriptor.value);
      const providers = isPlainObject(value) ? value.providers : void 0;
      if (isPlainObject(providers)) return providers;
    }
  } catch {
  }
  return void 0;
}
function providersFromLoader(ctx) {
  const owner = ctx;
  const loader = owner.root?.loader ?? owner.loader;
  if (!isPlainObject(loader) || typeof loader.entries !== "function") return void 0;
  try {
    for (const entry of loader.entries()) {
      if (!isPlainObject(entry) || !isPlainObject(entry.options)) continue;
      const id = typeof entry.options.id === "string" ? entry.options.id : void 0;
      const name2 = typeof entry.options.name === "string" ? entry.options.name : void 0;
      const isPiAi = id === "llm-pi-ai" || id === "llm" || name2 === "@deepseek-ai/dsh-llm-pi-ai" || name2 !== void 0 && name2.endsWith("/llm-pi-ai");
      if (!isPiAi) continue;
      const fiber = isPlainObject(entry.fiber) ? entry.fiber : void 0;
      const value = unwrapVolatile(fiber?.config);
      const providers = isPlainObject(value) ? value.providers : void 0;
      if (isPlainObject(providers)) return providers;
    }
  } catch {
  }
  return void 0;
}
function matchesCompanyBaseURL(baseURL) {
  const candidate = baseURL.trim();
  if (candidate === "") return false;
  if (candidate.toLowerCase().startsWith(COMPANY_URL_PREFIX.toLowerCase())) return true;
  try {
    return new URL(candidate).origin === new URL(COMPANY_URL_PREFIX).origin;
  } catch {
    return false;
  }
}
function toCompanyRoute(id, profile) {
  if (!isPlainObject(profile)) return void 0;
  const baseURL = typeof profile.baseURL === "string" ? profile.baseURL : void 0;
  if (baseURL === void 0 || !matchesCompanyBaseURL(baseURL)) return void 0;
  return {
    id,
    ...typeof profile.apiKeyEnv === "string" && profile.apiKeyEnv !== "" ? { apiKeyEnv: profile.apiKeyEnv } : {},
    ...baseURL !== void 0 ? { baseURL } : {}
  };
}
function resolveCompanyRoutes(ctx) {
  const cached = routesCache;
  if (cached !== void 0 && Date.now() - cached.at < ROUTES_CACHE_MS) return cached.routes;
  const providers = providersFromDescribe(ctx) ?? providersFromLoader(ctx);
  const routes = [];
  if (providers !== void 0) {
    for (const [id, profile] of Object.entries(providers)) {
      const route = toCompanyRoute(id, profile);
      if (route !== void 0) routes.push(route);
    }
  }
  const resolved = routes.length > 0 ? routes : [{ id: PROVIDER_ID, apiKeyEnv: API_KEY_REF }];
  routesCache = { at: Date.now(), routes: resolved };
  return resolved;
}
function companyRouteIds(routes) {
  const ids = /* @__PURE__ */ new Set([PROVIDER_ID]);
  for (const route of routes) ids.add(route.id);
  return ids;
}
function quotaUrlFor(routes) {
  const baseURL = routes[0]?.baseURL;
  if (baseURL !== void 0) {
    try {
      return `${new URL(baseURL).origin}/token-kanban/api/v1/openapi/member-quota?user_id=${encodeURIComponent(MIP_USER_ID)}`;
    } catch {
    }
  }
  return QUOTA_URL;
}
async function resolveApiKey(ctx, ref) {
  const credentials = serviceOf(ctx, "credentials");
  if (credentials === void 0) return void 0;
  try {
    const resolved = await credentials.resolve(ref);
    return resolved?.value !== void 0 && resolved.value !== "" ? resolved.value : void 0;
  } catch {
    return void 0;
  }
}
async function fetchQuota(apiKey, url) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  const body = await response.json().catch(() => void 0);
  const root = typeof body === "object" && body !== null ? body : {};
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (root.code !== 0) throw new Error(`\u63A5\u53E3 code ${String(root.code)}${root.message ? `: ${root.message}` : ""}`);
  const quota = root.data?.quota;
  if (quota === void 0 || typeof quota.total !== "number" || typeof quota.remaining !== "number") {
    throw new Error("\u989D\u5EA6\u54CD\u5E94\u7F3A\u5C11 quota.total/remaining");
  }
  return {
    unit: typeof quota.unit === "string" && quota.unit !== "" ? quota.unit : "CNY",
    total: quota.total,
    remaining: quota.remaining,
    ...typeof quota.resetAt === "string" ? { resetsAt: quota.resetAt } : {},
    ...typeof root.data?.planName === "string" && root.data.planName !== "\u65E0" ? { planName: root.data.planName } : {},
    ...typeof root.data?.billingMethod === "string" ? { billingMethod: root.data.billingMethod } : {}
  };
}
function forecastFrom(quota, nowMs) {
  const { total, remaining } = quota;
  if (!(total > 0) || !(remaining > 0)) return void 0;
  const cycleEnd = quota.resetsAt === void 0 ? void 0 : new Date(quota.resetsAt);
  if (cycleEnd === void 0 || Number.isNaN(cycleEnd.getTime())) return void 0;
  const dayMs = 864e5;
  const cycleStart = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, cycleEnd.getDate());
  const elapsed = Math.max(1, (nowMs - cycleStart.getTime()) / dayMs);
  const used = total - remaining;
  const daily = used / elapsed;
  if (!(daily > 0)) return void 0;
  const daysLeft = remaining / daily;
  const predicted = new Date(nowMs + Math.ceil(daysLeft) * dayMs);
  const lastDay = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), 0);
  const daysToEnd = Math.max(0, (cycleEnd.getTime() - nowMs) / dayMs);
  return {
    daily,
    daysLeft,
    predictedKey: localDateKey(predicted.getTime()),
    lastKey: localDateKey(lastDay.getTime()),
    monthly: localDateKey(predicted.getTime()) >= localDateKey(lastDay.getTime()),
    projectedLeft: Math.max(0, remaining - daily * daysToEnd),
    cycleStart: localDateKey(cycleStart.getTime()),
    cycleEnd: localDateKey(cycleEnd.getTime())
  };
}
function refreshQuota(ctx, routes) {
  if (quotaInflight !== void 0) return quotaInflight;
  quotaInflight = (async () => {
    const previous = quotaCache?.quota;
    const ref = routes[0]?.apiKeyEnv ?? API_KEY_REF;
    try {
      const apiKey = await resolveApiKey(ctx, ref);
      if (apiKey === void 0) {
        quotaCache = {
          at: Date.now(),
          ...previous !== void 0 ? { quota: previous } : {},
          error: `\u672A\u627E\u5230\u51ED\u636E ${ref}\uFF08\u5BBF\u4E3B credentials \u670D\u52A1\uFF09`
        };
        return;
      }
      const quota = await fetchQuota(apiKey, quotaUrlFor(routes));
      quotaCache = { at: Date.now(), quota };
      await recordBalance(quota, Date.now());
    } catch (failure) {
      const message = failure instanceof Error && (failure.name === "TimeoutError" || failure.name === "AbortError") ? `\u989D\u5EA6\u63A5\u53E3\u8D85\u65F6\uFF08${TIMEOUT_MS / 1e3}s\uFF09` : failure instanceof Error ? failure.message : String(failure);
      quotaCache = {
        at: Date.now(),
        ...previous !== void 0 ? { quota: previous } : {},
        error: message
      };
    } finally {
      quotaInflight = void 0;
    }
  })();
  return quotaInflight;
}
async function overview(ctx, force) {
  const now = Date.now();
  const routes = resolveCompanyRoutes(ctx);
  const cached = quotaCache;
  const fresh = cached !== void 0 && now - cached.at < CACHE_MS;
  if (force || cached === void 0) {
    await refreshQuota(ctx, routes);
  } else if (!fresh) {
    void refreshQuota(ctx, routes);
  }
  const current = quotaCache;
  const quota = current?.quota;
  const error = current?.error;
  const balanceRows = await dailySpend(now);
  const firstBalance = await firstSnapshotDate();
  const legacyRows = await legacyDaily(companyRouteIds(routes), firstBalance ?? localDateKey(now));
  const byDate = /* @__PURE__ */ new Map();
  for (const row of legacyRows) byDate.set(row.date, row);
  for (const row of balanceRows) byDate.set(row.date, row);
  const tokenDays = await collectTokens(ctx, companyRouteIds(routes));
  for (const [date, tokens] of tokenDays) {
    const row = byDate.get(date);
    if (row === void 0) byDate.set(date, { date, cost: 0, tokens: tokens.totalTokens });
    else row.tokens = tokens.totalTokens;
  }
  const daily = [...byDate.values()].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const todayKey = localDateKey(now);
  const today = daily.find((row) => row.date === todayKey) ?? { date: todayKey, cost: 0, tokens: 0 };
  const forecast = quota === void 0 ? void 0 : forecastFrom(quota, now);
  return {
    updatedAt: now,
    provider: routes[0]?.id ?? PROVIDER_ID,
    displayName: "\u516C\u53F8",
    userId: MIP_USER_ID,
    ...quota !== void 0 ? { quota } : {},
    daily,
    today,
    ...forecast !== void 0 ? { forecast } : {},
    ...error !== void 0 ? { error } : {}
  };
}
function writeJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}
function isLoopback(req) {
  const address = req.socket.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
function overviewRoute(ctx) {
  return {
    kind: "exact",
    path: `${API_PREFIX}/overview`,
    handler: async (req, res) => {
      if (!isLoopback(req)) {
        writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" });
        return;
      }
      writeJson(res, 200, await overview(ctx, false));
    }
  };
}
function refreshRoute(ctx) {
  return {
    kind: "exact",
    path: `${API_PREFIX}/refresh`,
    handler: async (req, res) => {
      if (!isLoopback(req)) {
        writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" });
        return;
      }
      if (req.method !== "POST") {
        writeJson(res, 405, { ok: false, error: "method not allowed" });
        return;
      }
      writeJson(res, 200, await overview(ctx, true));
    }
  };
}
function apply(ctx) {
  const disposers = [overviewRoute(ctx), refreshRoute(ctx)].map((route) => ctx.webServer.register(route));
  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch {
      }
    }
  }, "dsh-plugin-company-quota: routes");
  const sampleOnce = () => {
    const cached = quotaCache;
    if (cached !== void 0 && Date.now() - cached.at < CACHE_MS) return;
    void refreshQuota(ctx, resolveCompanyRoutes(ctx));
  };
  const timer = setInterval(sampleOnce, SAMPLE_MS);
  timer.unref?.();
  const kickoff = setTimeout(sampleOnce, 5e3);
  kickoff.unref?.();
  const warm = setTimeout(() => {
    void warmTokens(companyRouteIds(resolveCompanyRoutes(ctx))).catch(() => {
    });
  }, 8e3);
  warm.unref?.();
  ctx.effect(() => () => {
    clearInterval(timer);
    clearTimeout(kickoff);
    clearTimeout(warm);
  }, "dsh-plugin-company-quota: sampling");
}
export {
  apply,
  inject,
  name
};
