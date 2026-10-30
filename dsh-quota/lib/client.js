window.__ModuleLoader__.load({ id: "dsh-plugin-company-quota", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/CompanyQuotaSection.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var POLL_MS = 6e4;
var RETRY_MS = 1e4;
function formatTokens(value) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1e3) return String(Math.round(value));
  if (value < 1e6) return trimNumber(value / 1e3) + "k";
  if (value < 1e9) return trimNumber(value / 1e6) + "M";
  return trimNumber(value / 1e9) + "B";
}
function trimNumber(value) {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}
function money(value) {
  if (!Number.isFinite(value)) return "\xA50.00";
  return "\xA5" + (value < 0.01 ? value.toFixed(4) : value.toFixed(2));
}
function dateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function Calendar(props) {
  const { daily, forecast, offset, onOffset, t } = props;
  const now = /* @__PURE__ */ new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const byDate = new Map(daily.map((row) => [row.date, row]));
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let monthCost = 0;
  let monthTokens = 0;
  for (const row of daily) {
    if (row.date.slice(0, 7) !== monthKey) continue;
    monthCost += row.cost;
    monthTokens += row.tokens;
  }
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  const weekdays = t("weekdays").split(",");
  const showForecast = forecast !== void 0 && monthKey === currentMonthKey;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.calendar, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.calendarHead, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.muted, children: t("hint") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.monthNav, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.navButton, "aria-label": t("prev"), onClick: () => onOffset(offset - 1), children: "\u2039" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.monthLabel, children: monthKey }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.navButton, "aria-label": t("next"), onClick: () => onOffset(offset + 1), children: "\u203A" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.weekRow, children: weekdays.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.weekCell, children: label }, label)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.grid, children: cells.map((day, index) => {
      if (day === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}, `blank-${index}`);
      const key = dateKey(year, month, day);
      const row = byDate.get(key);
      const cost = row === void 0 ? 0 : row.cost;
      const tokens = row === void 0 ? 0 : row.tokens;
      const isEnd = showForecast && !forecast.monthly && forecast.predictedKey === key;
      const isLeft = showForecast && forecast.monthly && forecast.lastKey === key;
      const cellStyle = {
        ...styles.cell,
        ...isEnd ? styles.cellEnd : isLeft ? styles.cellLeft : cost > 0 ? styles.cellUsed : null
      };
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: cellStyle, title: cost > 0 ? `${key} ${money(cost)}` : key, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.cellDay, children: day }),
        (cost > 0 || tokens > 0 || isEnd || isLeft) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.cellBody, children: [
          cost > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.cellCost, children: money(cost) }),
          cost > 0 && tokens > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.cellTokens, children: formatTokens(tokens) }),
          isEnd && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badgeEnd, children: t("badgeEnd") }),
          isLeft && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badgeLeft, children: t("badgeLeft", { left: money(forecast.projectedLeft) }) })
        ] })
      ] }, key);
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.muted, children: daily.length === 0 ? t("none") : t("monthTotal", { cost: money(monthCost), tokens: formatTokens(monthTokens) }) }),
    showForecast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.muted, children: forecast.monthly ? t("forecastLeft", { daily: money(forecast.daily), left: money(forecast.projectedLeft) }) : t("forecastEnd", { daily: money(forecast.daily), date: forecast.predictedKey }) })
  ] });
}
function CompanyQuotaSection(props) {
  const { t } = props;
  const [doc, setDoc] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [refreshing, setRefreshing] = (0, import_react.useState)(false);
  const [offset, setOffset] = (0, import_react.useState)(0);
  const aliveRef = (0, import_react.useRef)(true);
  const load = (0, import_react.useCallback)(async (path, method) => {
    try {
      const response = await fetch(path, method === "POST" ? { method: "POST" } : void 0);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!aliveRef.current) return;
      setDoc(body);
      setError(null);
    } catch (failure) {
      if (!aliveRef.current) return;
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);
  const periodMs = doc?.quota === void 0 ? RETRY_MS : POLL_MS;
  (0, import_react.useEffect)(() => {
    aliveRef.current = true;
    void load("api/company-quota/overview", "GET");
    const timer = setInterval(() => {
      void load("api/company-quota/overview", "GET");
    }, periodMs);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [load, periodMs]);
  const refresh = () => {
    setRefreshing(true);
    void load("api/company-quota/refresh", "POST").finally(() => {
      if (aliveRef.current) setRefreshing(false);
    });
  };
  const quota = doc?.quota;
  const percent = quota === void 0 || quota.total <= 0 ? void 0 : (quota.total - quota.remaining) / quota.total * 100;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { style: styles.section, "data-dsh-part": "company-quota", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { style: styles.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: styles.title, children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.muted, children: t("account", { id: doc?.userId ?? "\u2014" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.headerRight, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.muted, children: doc === null ? "" : t("updated", { time: new Date(doc.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.refreshButton, onClick: refresh, disabled: refreshing, children: refreshing ? t("refreshing") : t("refresh") })
      ] })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.muted, children: t("loading") }),
    error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.error, children: t("error", { error }) }),
    error === null && doc?.error !== void 0 && doc.quota === void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.error, children: t("error", { error: doc.error }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.stats, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.stat, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statLabel, children: t("remaining") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statValue, children: quota === void 0 ? "\u2014" : money(quota.remaining) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.stat, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statLabel, children: t("used") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statValue, children: percent === void 0 ? "\u2014" : `${percent.toFixed(1)}%` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.stat, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statLabel, children: t("today") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statValue, children: doc === null ? "\u2014" : `${money(doc.today.cost)} \xB7 ${formatTokens(doc.today.tokens)}` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.stat, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.statLabel, children: t("reset", { date: quota?.resetsAt === void 0 ? "\u2014" : new Date(quota.resetsAt).toLocaleDateString() }) }) })
    ] }),
    doc !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { daily: doc.daily, forecast: doc.forecast, offset, onOffset: setOffset, t })
  ] });
}
var styles = {
  section: { display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
  headerRight: { display: "flex", alignItems: "center", gap: "8px", flex: "none" },
  title: { margin: "0 0 2px", fontSize: "16px", fontWeight: 600, lineHeight: "24px", color: "var(--dsw-alias-label-primary)" },
  muted: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" },
  error: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-state-error-primary, #d4380d)" },
  refreshButton: {
    height: "28px",
    padding: "0 12px",
    border: "0.5px solid var(--dsw-alias-border-l2)",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--dsw-alias-label-primary)",
    fontSize: "12px",
    cursor: "pointer"
  },
  stats: { display: "flex", flexWrap: "wrap", gap: "8px 20px", alignItems: "baseline" },
  stat: { display: "flex", alignItems: "baseline", gap: "6px" },
  statLabel: { fontSize: "12px", color: "var(--dsw-alias-label-secondary)" },
  statValue: { fontSize: "15px", fontWeight: 600, color: "var(--dsw-alias-label-primary)" },
  calendar: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    border: "0.5px solid var(--dsw-alias-border-l2)",
    borderRadius: "12px",
    background: "var(--dsw-alias-bg-layer-1)"
  },
  calendarHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  monthNav: { display: "flex", alignItems: "center", gap: "6px", flex: "none" },
  monthLabel: { minWidth: "62px", textAlign: "center", fontSize: "12px", color: "var(--dsw-alias-label-primary)" },
  navButton: {
    width: "24px",
    height: "24px",
    border: "0.5px solid var(--dsw-alias-border-l2)",
    borderRadius: "6px",
    background: "transparent",
    color: "var(--dsw-alias-label-primary)",
    cursor: "pointer",
    lineHeight: 1
  },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px", textAlign: "center" },
  weekCell: { fontSize: "11px", color: "var(--dsw-alias-label-secondary)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" },
  cell: {
    position: "relative",
    minHeight: "58px",
    borderRadius: "8px",
    padding: "4px",
    border: "1px solid var(--dsw-alias-border-l2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  cellUsed: { border: "1px solid var(--dsw-alias-state-business-primary, #4d6bfe)", background: "rgba(77,107,254,.14)" },
  cellEnd: { border: "1px solid #f87171", background: "rgba(248,113,113,.14)" },
  cellLeft: { border: "1px solid #7dd3fc", background: "rgba(125,211,252,.12)" },
  cellDay: { position: "absolute", top: "3px", right: "6px", fontSize: "10px", color: "var(--dsw-alias-label-secondary)" },
  cellBody: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  cellCost: { fontSize: "12px", fontWeight: 600, color: "#fcd34d" },
  cellTokens: { fontSize: "10px", color: "var(--dsw-alias-label-secondary)" },
  badgeEnd: { fontSize: "10px", fontWeight: 600, color: "#f87171", whiteSpace: "nowrap" },
  badgeLeft: { fontSize: "10px", fontWeight: 600, color: "#7dd3fc", whiteSpace: "nowrap" }
};

// src/client/locales.ts
var NS = "company-quota";
var zh = {
  "nav": "\u516C\u53F8\u989D\u5EA6",
  "title": "\u516C\u53F8\u989D\u5EA6",
  "hint": "\u6BCF\u683C\u4E00\u5929\uFF1A\u53F3\u4E0A\u89D2\u4E3A\u65E5\u671F\uFF0C\u4E2D\u95F4\u662F\u5F53\u5929\u516C\u53F8\u6A21\u578B\u7684\u6D88\u8D39\u91D1\u989D\u4E0E tokens\uFF1B0 \u4E0D\u663E\u793A\uFF0C\u53EF\u7FFB\u6708\u3002",
  "loading": "\u6B63\u5728\u52A0\u8F7D\u989D\u5EA6\u2026",
  "error": "\u67E5\u8BE2\u5931\u8D25\uFF1A{error}",
  "noQuota": "\u989D\u5EA6\u4E0D\u53EF\u7528",
  "remaining": "\u5269\u4F59\u989D\u5EA6",
  "used": "\u672C\u6708\u5DF2\u7528",
  "reset": "{date} \u91CD\u7F6E",
  "today": "\u4ECA\u65E5\u5DF2\u7528",
  "account": "MIP \u8D26\u53F7 {id}",
  "refresh": "\u5237\u65B0",
  "refreshing": "\u5237\u65B0\u4E2D\u2026",
  "updated": "\u66F4\u65B0\u4E8E {time}",
  "monthTotal": "\u672C\u6708\u5408\u8BA1 {cost} \xB7 {tokens} tokens",
  "none": "\u6682\u65E0\u516C\u53F8\u6A21\u578B\u7528\u91CF\u6570\u636E\uFF08\u7EDF\u8BA1\u81EA\u63D2\u4EF6\u542F\u7528\u8D77\uFF09",
  "prev": "\u4E0A\u4E00\u6708",
  "next": "\u4E0B\u4E00\u6708",
  "weekdays": "\u4E00,\u4E8C,\u4E09,\u56DB,\u4E94,\u516D,\u65E5",
  "forecastEnd": "\u6309\u5F53\u524D\u5747\u503C {daily}/\u5929\uFF0C\u9884\u8BA1 {date} \u7528\u5B8C",
  "forecastLeft": "\u6309\u5F53\u524D\u5747\u503C {daily}/\u5929\uFF0C\u6708\u5E95\u9884\u8BA1\u5269\u4F59 {left}",
  "badgeEnd": "\u9884\u8BA1\u7528\u5B8C",
  "badgeLeft": "\u5269 {left}"
};
var en = {
  "nav": "Company Quota",
  "title": "Company Quota",
  "hint": "One cell per day: the date in the corner, that day's company-model spend and tokens in the middle; zero days stay blank and months can be paged.",
  "loading": "Loading quota\u2026",
  "error": "Query failed: {error}",
  "noQuota": "Quota unavailable",
  "remaining": "Remaining",
  "used": "Used this month",
  "reset": "resets {date}",
  "today": "Today",
  "account": "MIP account {id}",
  "refresh": "Refresh",
  "refreshing": "Refreshing\u2026",
  "updated": "Updated {time}",
  "monthTotal": "Month total {cost} \xB7 {tokens} tokens",
  "none": "No company usage yet (counting starts when the plugin is enabled)",
  "prev": "Previous month",
  "next": "Next month",
  "weekdays": "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
  "forecastEnd": "At the current {daily}/day, projected to run out on {date}",
  "forecastLeft": "At the current {daily}/day, about {left} left at month end",
  "badgeEnd": "runs out",
  "badgeLeft": "left {left}"
};

// src/client/index.ts
var inject = ["slots", "locale"];
var SECTION_ORDER = 152;
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-plugin-company-quota: dictionaries");
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "company-quota",
    order: SECTION_ORDER,
    label: () => ctx.locale.bind(NS)("nav"),
    locale: NS,
    inject: () => ({})
  }, CompanyQuotaSection));
}
return module.exports; } });
