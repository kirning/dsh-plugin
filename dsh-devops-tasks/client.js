window.__ModuleLoader__.load({
  id: "dsh-devops-tasks",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");

    /** Shorthand for React.createElement (this module ships unbuilt). */
    const h = react.createElement;

    /** Locale namespace, panel id, and the host route this panel reads. */
    const NS = "dsh-devops-tasks";
    const PANEL_ID = "devops-tasks";
    const API = "/api/dsh-devops-tasks";

    // #region styles
    const CSS = [
      ".dt-panel{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;min-width:0;padding:14px 16px 16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}",
      ".dt-header{display:flex;flex:none;align-items:center;gap:10px}",
      ".dt-title{flex:1;margin:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dt-badge{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:1px 8px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:nowrap}",
      ".dt-badge[data-state=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".dt-badge[data-state=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".dt-badge[data-state=err]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".dt-tiles{display:grid;flex:none;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}",
      ".dt-tile{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;text-align:left;font-family:inherit;color:inherit}",
      ".dt-tile:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-tile[data-active]{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}",
      ".dt-tileTop{display:flex;align-items:baseline;gap:8px}",
      ".dt-tileLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}",
      ".dt-tileValue{font-size:20px;font-weight:700;line-height:1.2}",
      ".dt-tileHint{font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}",
      ".dt-toolbar{display:flex;flex:none;flex-wrap:wrap;align-items:center;gap:8px}",
      ".dt-spacer{flex:1}",
      ".dt-input{background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:13px;color:var(--dsw-alias-label-primary);outline:none;min-width:180px}",
      ".dt-input:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".dt-input::placeholder{color:var(--dsw-alias-label-tertiary)}",
      ".dt-btn{background:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 12px;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}",
      ".dt-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-btn:disabled{opacity:.45;cursor:default}",
      ".dt-body{display:flex;flex:1;flex-direction:column;gap:10px;min-height:0;overflow-y:auto}",
      ".dt-tableWrap{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:auto}",
      ".dt-table{border-collapse:collapse;width:100%;font-size:12.5px}",
      ".dt-table th{position:sticky;top:0;z-index:1;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;text-align:left;white-space:nowrap}",
      ".dt-table td{padding:7px 10px;border-bottom:1px solid var(--dsw-alias-separator-primary);vertical-align:middle}",
      ".dt-table tbody tr:last-child td{border-bottom:none}",
      ".dt-table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".dt-muted{color:var(--dsw-alias-label-tertiary)}",
      ".dt-empty{padding:28px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:1.6}",
      ".dt-chip{display:inline-block;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 7px;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary);white-space:nowrap}",
      ".dt-chip[data-tone=doing]{color:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}",
      ".dt-chip[data-tone=done]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".dt-chip[data-tone=high]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".dt-chip[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".dt-notice{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 12px;font-size:12.5px;line-height:1.5;overflow-wrap:anywhere}",
      ".dt-notice[data-kind=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".dt-notice[data-kind=error]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".dt-notice[data-kind=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".dt-notice[data-kind=info]{color:var(--dsw-alias-label-secondary)}",
      ".dt-idBtn{background:none;border:none;padding:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-state-business-primary);cursor:pointer;white-space:nowrap}",
      ".dt-idBtn:hover{text-decoration:underline}",
      ".dt-spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--dsw-alias-state-business-primary);border-top-color:transparent;border-radius:50%;vertical-align:-1px;animation:dt-spin .8s linear infinite}",
      "@keyframes dt-spin{to{transform:rotate(360deg)}}",
      ".dt-footer{flex:none;font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}",
    ].join("");

    /** Install the stylesheet once and return its disposer. */
    function installStyles() {
      const tagId = "dsh-devops-tasks/panel.css";
      if (typeof document === "undefined") return () => {};
      const existing = document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + "]");
      if (existing !== null) return () => {};
      const tag = document.createElement("style");
      tag.setAttribute("data-plugin-css", tagId);
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => {
        if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
      };
    }
    // #endregion

    // #region locale
    const zh = {
      "entry.label": "我的 DevOps",
      "panel.title": "我的 DevOps",
      "panel.back": "返回对话",
      "common.loading": "加载中…",
      "common.refresh": "刷新",
      "common.search": "搜索编号或标题",
      "common.copy": "复制",
      "common.copied": "已复制编号",
      "common.none": "-",
      "tab.todo": "待办",
      "tab.review": "待审",
      "tab.created": "我创建的",
      "count.todo": "待办",
      "count.review": "待审",
      "count.created": "我创建的",
      "count.empty": "暂无",
      "col.id": "编号",
      "col.title": "标题",
      "col.type": "类型",
      "col.status": "状态",
      "col.priority": "优先级",
      "col.end": "截止",
      "col.system": "所属系统",
      "col.reviewKind": "评审类型",
      "empty.todo": "没有待办事项。",
      "empty.review": "没有等待你评审的事项。",
      "empty.created": "你最近没有创建的事项。",
      "empty.search": "没有匹配的条目。",
      "hint.todo": "按截止日期从近到远排列；点击编号可复制到剪贴板。",
      "hint.review": "汇总各类等待你评审的事项。",
      "hint.created": "你创建的缺陷、需求、审批与通用流程。",
      "state.fetched": "更新于 {time}",
      "state.stale": "数据来自缓存",
      "state.error": "取数失败",
      "state.loading": "正在读取 DevOps…",
      "state.truncated": "共 {total} 条，面板只显示前 {shown} 条。",
      "state.total": "共 {total} 条",
      "warn.title": "部分数据获取失败",
      "help.endpointMissing": "没有找到 DevOps MCP 服务的地址：请在「设置 → MCP 服务」里添加 devops-mcp-agile，或在本插件配置里填写 endpoint。",
      "help.retry": "稍后再试一次",
      "cat.STORY": "故事",
      "cat.TASK": "任务",
      "cat.ISSUE": "缺陷",
      "cat.EPIC": "史诗",
      "cat.TEST_PLAN": "测试计划",
      "cat.REMIND_ME": "提醒",
      "cat.PARAM_TEST_PLAN": "参数化测试计划",
      "cat.BIZ_REQUIREMENT": "业务需求",
      "cat.TEST_PLAN_REVIEW": "测试计划评审",
      "cat.TEST_REPORT_REVIEW": "测试报告评审",
      "cat.MILESTONE_APPROVE": "里程碑",
      "cat.COMMON_REVIEW_FLOW": "通用流程",
      "cat.APPROVE_PROCESS": "审批流程",
      "cat.SHARED_TEST_CASE": "共享用例",
      "cat.ALL": "全部",
    };

    const en = {
      "entry.label": "My DevOps",
      "panel.title": "My DevOps",
      "panel.back": "Back to chat",
      "common.loading": "Loading…",
      "common.refresh": "Refresh",
      "common.search": "Search id or title",
      "common.copy": "Copy",
      "common.copied": "Copied id",
      "common.none": "-",
      "tab.todo": "To do",
      "tab.review": "To review",
      "tab.created": "Created",
      "count.todo": "To do",
      "count.review": "To review",
      "count.created": "Created",
      "count.empty": "none",
      "col.id": "ID",
      "col.title": "Title",
      "col.type": "Type",
      "col.status": "Status",
      "col.priority": "Priority",
      "col.end": "Due",
      "col.system": "System",
      "col.reviewKind": "Review kind",
      "empty.todo": "Nothing on your plate.",
      "empty.review": "Nothing waiting for your review.",
      "empty.created": "You have not created anything recently.",
      "empty.search": "No matching item.",
      "hint.todo": "Sorted by due date, nearest first. Click an id to copy it.",
      "hint.review": "Every kind of item waiting for your review.",
      "hint.created": "Issues, demands, approvals and flows you created.",
      "state.fetched": "Updated {time}",
      "state.stale": "served from cache",
      "state.error": "Load failed",
      "state.loading": "Reading from DevOps…",
      "state.truncated": "{total} items, showing the first {shown}.",
      "state.total": "{total} items",
      "warn.title": "Some data could not be loaded",
      "help.endpointMissing": "No DevOps MCP endpoint was found: add devops-mcp-agile under Settings → MCP servers, or set endpoint in this plugin row.",
      "help.retry": "Try again later",
      "cat.STORY": "Story",
      "cat.TASK": "Task",
      "cat.ISSUE": "Issue",
      "cat.EPIC": "Epic",
      "cat.TEST_PLAN": "Test plan",
      "cat.REMIND_ME": "Reminder",
      "cat.PARAM_TEST_PLAN": "Param test plan",
      "cat.BIZ_REQUIREMENT": "Business demand",
      "cat.TEST_PLAN_REVIEW": "Test plan review",
      "cat.TEST_REPORT_REVIEW": "Test report review",
      "cat.MILESTONE_APPROVE": "Milestone",
      "cat.COMMON_REVIEW_FLOW": "Common flow",
      "cat.APPROVE_PROCESS": "Approval",
      "cat.SHARED_TEST_CASE": "Shared cases",
      "cat.ALL": "All",
    };
    // #endregion

    // #region api
    /** Error carrying the route's JSON error message. */
    class ApiError extends Error {
      constructor(message) {
        super(message);
        this.name = "DevopsApiError";
      }
    }

    /** Parse a JSON response or throw an ApiError. */
    async function readJson(response) {
      let body;
      try {
        body = await response.json();
      } catch {
        throw new ApiError("HTTP " + response.status + ": invalid JSON response");
      }
      if (!response.ok) {
        throw new ApiError(typeof body === "object" && body !== null && typeof body.error === "string" ? body.error : "HTTP " + response.status);
      }
      return body;
    }

    /** The panel's only data entry point: one host route, two shapes. */
    class DevopsApi {
      async request(path) {
        return readJson(await fetch(API + path, { method: "GET" }));
      }

      snapshot(force) {
        return this.request("/snapshot" + (force === true ? "?force=1" : ""));
      }

      health() {
        return this.request("/health");
      }
    }
    // #endregion

    // #region helpers
    /** Copy text to the clipboard, reporting success. */
    async function copyText(value) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
          return true;
        }
      } catch {
        /* fall through to the legacy path */
      }
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        return ok;
      } catch {
        return false;
      }
    }

    /** Fill `{name}` placeholders in a dictionary string. */
    function fill(text, values) {
      if (typeof text !== "string") return "";
      if (values === undefined) return text;
      return text.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));
    }

    /** `YYYY-MM-DD` from an ISO-ish platform value, or "". */
    function dayOf(value) {
      if (typeof value !== "string" || value === "") return "";
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
      return match === null ? "" : match[1] + "-" + match[2] + "-" + match[3];
    }

    /** Today's `YYYY-MM-DD` in the browser's zone. */
    function today() {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return String(now.getFullYear()) + "-" + month + "-" + day;
    }

    /** Local `HH:mm:ss` for a fetch timestamp. */
    function clockOf(iso) {
      if (typeof iso !== "string" || iso === "") return "";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleTimeString();
    }

    /** Whether a due date is already behind today. */
    function isOverdue(value) {
      const day = dayOf(value);
      return day !== "" && day < today();
    }

    /** Tone for a status chip: 进行中-like values get the business accent. */
    function statusTone(row) {
      if (row.stage === "1") return "doing";
      if (typeof row.status === "string" && /完成|已关闭|Done/i.test(row.status)) return "done";
      return undefined;
    }

    /** Tone for a priority chip. */
    function priorityTone(value) {
      if (typeof value !== "string" || value === "") return undefined;
      if (/紧急|P0|高/i.test(value)) return "high";
      if (/中/i.test(value)) return "warn";
      return undefined;
    }

    /** Chip element. */
    function chip(text, tone) {
      if (typeof text !== "string" || text === "") return h("span", { className: "dt-muted" }, "-");
      return h("span", { className: "dt-chip", "data-tone": tone }, text);
    }

    /** Inline notice element. */
    function notice(kind, text) {
      return h("div", { className: "dt-notice", "data-kind": kind }, text);
    }

    /** Snapshot loader with an explicit refresh (cached or forced). */
    function useSnapshot(api) {
      const [state, setState] = react.useState({ loading: true, data: null, error: "" });
      const [request, setRequest] = react.useState({ force: false, ticket: 0 });
      // A stale snapshot is served instantly and refreshed once in the
      // background, so the panel never waits for a cold MCP handshake.
      const autoRefresh = react.useRef(0);
      react.useEffect(() => {
        let alive = true;
        setState((prev) => ({ loading: true, data: prev.data, error: "" }));
        // The first call of a cold host process can lose its MCP handshake, so a
        // failed load is retried once before the panel reports an error.
        const load = async () => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const data = await api.snapshot(request.force);
              if (!alive) return;
              setState({ loading: false, data, error: "" });
              if (data !== null && data.stale === true && autoRefresh.current < 1) {
                autoRefresh.current += 1;
                setTimeout(() => {
                  if (alive) setRequest((prev) => ({ force: false, ticket: prev.ticket + 1 }));
                }, 2500);
              }
              return;
            } catch (error) {
              if (!alive) return;
              if (attempt === 1) {
                setState({ loading: false, data: null, error: error instanceof Error ? error.message : String(error) });
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 1200));
              if (!alive) return;
            }
          }
        };
        load();
        return () => {
          alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [api, request]);
      return {
        loading: state.loading,
        data: state.data,
        error: state.error,
        refresh(force) {
          setRequest((prev) => ({ force: force === true, ticket: prev.ticket + 1 }));
        },
      };
    }

    /** The category breakdown under a count tile, e.g. "故事 3 · 任务 2". */
    function breakdown(t, counts) {
      if (counts === null || counts === undefined) return "";
      const categories = counts.categories !== null && typeof counts.categories === "object" ? counts.categories : {};
      const parts = [];
      for (const [key, value] of Object.entries(categories)) {
        if (key === "ALL" || typeof value !== "number" || value === 0) continue;
        parts.push(t("cat." + key) + " " + value);
      }
      if (parts.length === 0) return counts.total > 0 ? "" : t("count.empty");
      return parts.join(" · ");
    }
    // #endregion

    // #region panel
    /** Sidebar glyph for the DevOps panel entry: a small checklist. */
    function SidebarGlyph(props) {
      const size = props.size || 16;
      return h("svg", {
        viewBox: "0 0 16 16",
        width: size,
        height: size,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.3,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
        h("rect", { x: "3.2", y: "1.9", width: "9.6", height: "12.2", rx: "1.6" }),
        h("path", { d: "M5.8 5.4 6.9 6.5l1.9-2" }),
        h("path", { d: "M5.8 10.6 6.9 11.7l1.9-2" }),
        h("path", { d: "M9.9 6.1h1.6M9.9 11.3h1.6" }));
    }

    /** One bucket tile: label, count, category breakdown. */
    function CountTile(props) {
      const t = props.t;
      return h("button", {
        type: "button",
        className: "dt-tile",
        "data-active": props.active ? "" : undefined,
        onClick: props.onSelect,
      },
        h("span", { className: "dt-tileTop" },
          h("span", { className: "dt-tileLabel" }, props.label),
          h("span", { className: "dt-tileValue" }, String(props.total))),
        h("span", { className: "dt-tileHint" }, props.hint === "" ? t("count.empty") : props.hint));
    }

    /** The panel: counts, three buckets, search. */
    function Panel(props) {
      const t = props.t;
      const api = props.api;
      const [tab, setTab] = react.useState("todo");
      const [query, setQuery] = react.useState("");
      const [copied, setCopied] = react.useState(null);
      const snap = useSnapshot(api);

      const data = snap.data;
      const tabs = [
        { id: "todo", label: t("tab.todo") },
        { id: "review", label: t("tab.review") },
        { id: "created", label: t("tab.created") },
      ];
      const counts = data !== null && data.counts !== null && data.counts !== undefined ? data.counts : {};
      const buckets = data !== null && data.tabs !== null && data.tabs !== undefined ? data.tabs : {};
      const bucket = buckets[tab] !== undefined && buckets[tab] !== null ? buckets[tab] : { items: [], total: 0 };
      const needle = query.trim().toLowerCase();
      const rows = (Array.isArray(bucket.items) ? bucket.items : []).filter((row) => (
        needle === ""
          ? true
          : String(row.title).toLowerCase().includes(needle) || String(row.id).toLowerCase().includes(needle)
      ));

      const onCopy = (id) => {
        copyText(id).then((ok) => {
          if (ok) {
            setCopied(id);
            setTimeout(() => setCopied((prev) => (prev === id ? null : prev)), 1600);
          }
        });
      };

      const columns = tab === "review"
        ? [
          { key: "id", label: t("col.id"), render: (row) => idCell(row, t, onCopy, copied) },
          { key: "title", label: t("col.title"), render: (row) => row.title },
          { key: "sceneLabel", label: t("col.reviewKind"), render: (row) => chip(row.sceneLabel) },
          { key: "status", label: t("col.status"), render: (row) => chip(row.status, statusTone(row)) },
          { key: "end", label: t("col.end"), render: (row) => endCell(row) },
          { key: "system", label: t("col.system"), render: (row) => systemCell(row) },
        ]
        : [
          { key: "id", label: t("col.id"), render: (row) => idCell(row, t, onCopy, copied) },
          { key: "title", label: t("col.title"), render: (row) => row.title },
          { key: "type", label: t("col.type"), render: (row) => row.type === "" ? h("span", { className: "dt-muted" }, "-") : row.type },
          { key: "status", label: t("col.status"), render: (row) => chip(row.status, statusTone(row)) },
          { key: "priority", label: t("col.priority"), render: (row) => chip(row.priority, priorityTone(row.priority)) },
          { key: "end", label: t("col.end"), render: (row) => endCell(row) },
          { key: "system", label: t("col.system"), render: (row) => systemCell(row) },
        ];

      const warnings = data !== null && Array.isArray(data.warnings) ? data.warnings : [];
      const fetchedAt = data === null ? "" : clockOf(data.fetchedAt);
      const stale = data !== null && data.stale === true;
      const stateChip = snap.error !== ""
        ? h("span", { className: "dt-badge", "data-state": "err" }, t("state.error"))
        : data === null
          ? null
          : stale
            ? h("span", { className: "dt-badge", "data-state": "ok", title: fill(t("state.fetched"), { time: fetchedAt }) }, t("state.stale"))
            : h("span", { className: "dt-badge", "data-state": "ok" }, fill(t("state.fetched"), { time: fetchedAt }));

      return h("div", { className: "dt-panel" },
        h("div", { className: "dt-header" },
          h("button", { type: "button", className: "dt-btn", onClick: props.onBack, title: t("panel.back") }, "‹"),
          h("h2", { className: "dt-title" }, t("panel.title")),
          stateChip,
          snap.loading ? h("span", { className: "dt-spinner", role: "status", "aria-label": t("common.loading") }) : null,
          h("button", { type: "button", className: "dt-btn", disabled: snap.loading, onClick: () => snap.refresh(true) }, t("common.refresh"))),

        h("div", { className: "dt-tiles" },
          tabs.map((entry) => {
            const countsFor = counts[entry.id] !== undefined && counts[entry.id] !== null ? counts[entry.id] : null;
            const bucketFor = buckets[entry.id] !== undefined && buckets[entry.id] !== null ? buckets[entry.id] : null;
            const total = countsFor !== null && typeof countsFor.total === "number" && countsFor.total > 0
              ? countsFor.total
              : (bucketFor !== null && typeof bucketFor.total === "number" ? bucketFor.total : 0);
            return h(CountTile, {
              key: entry.id,
              t,
              label: t("count." + entry.id),
              total,
              hint: breakdown(t, countsFor),
              active: tab === entry.id,
              onSelect: () => setTab(entry.id),
            });
          })),

        warnings.length > 0 ? notice("warn", t("warn.title") + "：" + warnings.join("；")) : null,
        snap.error !== "" ? notice("error", snap.error) : null,
        data === null && snap.loading ? h("div", { className: "dt-empty" }, t("state.loading")) : null,
        data !== null && data.endpoint === null && snap.error === "" ? notice("error", t("help.endpointMissing")) : null,

        h("div", { className: "dt-toolbar" },
          h("div", { className: "dt-tabs", style: { display: "flex", gap: "2px" } },
            tabs.map((entry) => h("button", {
              key: entry.id,
              type: "button",
              className: "dt-btn",
              "data-active": tab === entry.id ? "" : undefined,
              style: tab === entry.id ? { fontWeight: 700, color: "var(--dsw-alias-label-primary)", borderColor: "var(--dsw-alias-state-business-primary)" } : { color: "var(--dsw-alias-label-secondary)" },
              onClick: () => setTab(entry.id),
            }, entry.label))),
          h("input", {
            className: "dt-input",
            type: "search",
            value: query,
            placeholder: t("common.search"),
            "aria-label": t("common.search"),
            onChange: (event) => setQuery(event.target.value),
          }),
          h("span", { className: "dt-spacer" }),
          h("span", { className: "dt-muted", style: { fontSize: "11.5px" } }, t("hint." + tab))),

        h("div", { className: "dt-body" },
          snap.loading && data === null ? null : h(react.Fragment, null,
            rows.length === 0
              ? h("div", { className: "dt-empty" }, needle === "" ? t("empty." + tab) : t("empty.search"))
              : h("div", { className: "dt-tableWrap" },
                h("table", { className: "dt-table" },
                  h("thead", null, h("tr", null, columns.map((column) => h("th", { key: column.key }, column.label)))),
                  h("tbody", null, rows.map((row) => h("tr", { key: row.id === "" ? row.title + row.scene : row.id },
                    columns.map((column) => h("td", { key: column.key }, column.render(row)))))))),
            h("div", { className: "dt-footer" },
              bucket.truncated === true
                ? fill(t("state.truncated"), { total: bucket.total, shown: rows.length })
                : fill(t("state.total"), { total: bucket.total })))));
    }

    /** The id cell: a button that copies, confirming inline. */
    function idCell(row, t, onCopy, copied) {
      if (row.id === "") return h("span", { className: "dt-muted" }, "-");
      return h("button", {
        type: "button",
        className: "dt-idBtn",
        title: t("common.copy"),
        onClick: () => onCopy(row.id),
      }, copied === row.id ? t("common.copied") : row.id);
    }

    /** The due cell: date plus an overdue accent. */
    function endCell(row) {
      const day = dayOf(row.end);
      if (day === "") return h("span", { className: "dt-muted" }, "-");
      return h("span", {
        className: "dt-mono",
        style: isOverdue(row.end) ? { color: "var(--dsw-alias-state-error-primary)" } : undefined,
        title: row.end,
      }, day);
    }

    /** The system cell: name above id. */
    function systemCell(row) {
      if (row.system === "") return h("span", { className: "dt-muted" }, "-");
      const parts = String(row.system).split("/");
      return h("span", { title: row.system }, parts[0]);
    }
    // #endregion

    /** Register the sidebar entry and the panel it opens. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-devops-tasks: dictionaries");
      ctx.effect(() => installStyles(), "dsh-devops-tasks: styles");
      const t = ctx.locale.bind(NS);
      const api = new DevopsApi();

      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          api,
          t,
          onBack: () => ctx.layout.selectPanel(null),
        }),
      }, Panel));

      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 12,
        label: () => t("entry.label"),
        locale: NS,
      }, SidebarGlyph));
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "layout"];
    return module.exports;
  },
});
