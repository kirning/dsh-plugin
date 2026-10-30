// src/index.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// src/shared.ts
var PROVIDER_ID = "midea";
var API_PREFIX = "/api/company-quota";

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
var quotaCache;
var quotaInflight;
var routesCache;
function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}
function localDateKey(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function modelCost(model, totals) {
  const key = model.slice(model.lastIndexOf("/") + 1);
  const price = PRICES[key];
  if (price === void 0) return 0;
  return (totals.inputTokens * price[0] + totals.outputTokens * price[1] + totals.cacheReadTokens * price[2]) / 1e6;
}
function totalTokens(totals) {
  return totals.inputTokens + totals.outputTokens + totals.cacheReadTokens + totals.cacheWriteTokens;
}
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
function ledgerRouteIds(routes) {
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
async function readDaily(routeIds) {
  let raw;
  try {
    raw = await readFile(join(dshHome(), "dsh-usage", "usage-ledger.json"), "utf8");
  } catch {
    return [];
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return [];
  }
  const days = doc.days ?? {};
  const rows = [];
  for (const date of Object.keys(days).sort()) {
    const buckets = days[date];
    let tokens = 0;
    let calls = 0;
    let cost = 0;
    for (const id of routeIds) {
      const models = buckets?.[id];
      if (models === void 0) continue;
      for (const [model, totals] of Object.entries(models)) {
        tokens += totalTokens(totals);
        calls += totals.calls ?? 0;
        cost += modelCost(model, totals);
      }
    }
    rows.push({ date, tokens, calls, cost: Math.round(cost * 1e6) / 1e6 });
  }
  return rows;
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
      quotaCache = { at: Date.now(), quota: await fetchQuota(apiKey, quotaUrlFor(routes)) };
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
  const routeIds = ledgerRouteIds(routes);
  const daily = await readDaily(routeIds);
  const todayKey = localDateKey(now);
  const today = daily.find((row) => row.date === todayKey) ?? { date: todayKey, tokens: 0, calls: 0, cost: 0 };
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
  const forecast = quota === void 0 ? void 0 : forecastFrom(quota, now);
  return {
    updatedAt: now,
    provider: routes[0]?.id ?? PROVIDER_ID,
    providerIds: [...routeIds].sort(),
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
}
export {
  apply,
  inject,
  name
};
