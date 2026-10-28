window.__ModuleLoader__.load({
  id: "dsh-token-calendar",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");

    /** Shorthand for React.createElement (this module ships unbuilt). */
    const h = react.createElement;

    /** Locale namespace and the panel id shared with the sidebar entry. */
    const NS = "dsh-token-calendar";
    const PANEL_ID = "token-calendar";

    const API = "/api/dsh-token-calendar";

    // #region styles
    // Line colours are mixed from the label colour instead of using
    // --dsw-alias-border-l1: that token is 4% black in the light theme, which
    // is invisible against white. label-primary flips with the theme (near
    // black in light, near white in dark), so one rule reads well in both.
    //
    // Strengths were measured from the reference design: its dashed empty-day
    // border samples at rgb(110,111,111) on white, i.e. ~55% black, and its
    // solid cell outline at ~42%. The weak 9% value tried before was far too
    // faint, so the scale now runs 26% (filled outline) to 46% (empty dashes).
    const CSS = [
      ".tc-panel{--tc-line:color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);--tc-line-soft:color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);--tc-dash:color-mix(in srgb, var(--dsw-alias-label-primary) 46%, transparent);--tc-fill:color-mix(in srgb, var(--dsw-alias-label-primary) 3.5%, transparent);--tc-accent:var(--dsw-alias-state-business-primary);display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;min-width:0;padding:18px 20px 20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit)}",
      ".tc-scroll{display:flex;flex:1;flex-direction:column;gap:14px;min-height:0;overflow-y:auto;padding-right:2px}",
      ".tc-header{display:flex;align-items:center;gap:8px;flex:none}",
      ".tc-title{flex:1;margin:0;font-size:16px;font-weight:700;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".tc-nav{display:inline-flex;align-items:center;gap:6px;flex:none}",
      ".tc-btn{background:var(--tc-fill);border:1px solid var(--tc-line);border-radius:8px;padding:4px 11px;font-family:inherit;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;transition:background .12s ease,border-color .12s ease}",
      ".tc-btn:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);border-color:var(--tc-line)}",
      ".tc-btn:disabled{opacity:.45;cursor:default}",
      ".tc-btn[data-primary]{background:var(--tc-accent);border-color:transparent;color:var(--dsw-alias-label-primary-foreground);font-weight:600}",
      ".tc-month{background:var(--tc-fill);border:1px solid var(--tc-line);border-radius:8px;padding:4px 9px;font-family:inherit;font-size:13px;color:var(--dsw-alias-label-primary);outline:none;color-scheme:inherit}",
      ".tc-month:focus{border-color:var(--tc-accent)}",
      ".tc-toolbar{display:flex;flex:none;flex-wrap:wrap;align-items:center;gap:8px}",
      ".tc-select{background:var(--tc-fill);border:1px solid var(--tc-line);border-radius:8px;padding:4px 9px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary);outline:none}",
      ".tc-select:focus{border-color:var(--tc-accent)}",
      ".tc-spacer{flex:1}",
      ".tc-stack{display:flex;flex-direction:column;gap:14px;flex:none;width:100%;max-width:660px;margin:0 auto}",
      ".tc-calWrap{display:flex;flex-direction:column;gap:8px;flex:none;width:100%;container-type:inline-size}",
      ".tc-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;flex:none}",
      ".tc-weekday{text-align:center;font-size:11px;font-weight:600;letter-spacing:.6px;color:var(--dsw-alias-label-tertiary)}",
      ".tc-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;flex:none}",
      ".tc-cell{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;aspect-ratio:1/1;min-width:0;padding:4px 3px;border:1px solid var(--tc-line);border-radius:10px;background:var(--tc-fill);color:inherit;font-family:inherit;text-align:center;cursor:pointer;overflow:hidden;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease}",
      ".tc-cell[data-empty]{background:transparent;border-color:var(--tc-dash);border-style:dashed}",
      ".tc-cell:hover{border-color:var(--tc-accent);box-shadow:0 2px 10px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);transform:translateY(-1px)}",
      ".tc-cell[data-selected]{border-color:var(--tc-accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--tc-accent) 45%, transparent),0 2px 10px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent)}",
      ".tc-cell[data-today]::after{content:'';position:absolute;inset:0;border-radius:9px;box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-warn-primary);pointer-events:none}",
      ".tc-dayNum{position:absolute;top:4px;left:6px;font-size:10px;font-weight:600;line-height:1.2;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}",
      ".tc-cell[data-hot] .tc-dayNum{color:var(--dsw-alias-label-secondary)}",
      ".tc-cost{font-size:clamp(9px,3.4cqi,12.5px);font-weight:700;color:var(--dsw-alias-state-warn-primary, #d99b18);line-height:1.15;white-space:nowrap;letter-spacing:-.2px}",
      ".tc-tokens{font-size:clamp(8px,2.8cqi,10px);line-height:1.15;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".tc-cell[data-hot] .tc-tokens{color:var(--dsw-alias-label-secondary)}",
      ".tc-legend{display:flex;align-items:center;gap:6px;justify-content:flex-end;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
      ".tc-swatches{display:inline-flex;gap:3px}",
      ".tc-swatch{width:12px;height:12px;border-radius:4px;border:1px solid var(--tc-line-soft)}",
      ".tc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;flex:none}",
      ".tc-stat{display:flex;flex-direction:column;gap:2px;padding:9px 12px;border:1px solid var(--tc-line-soft);border-radius:10px;background:var(--tc-fill);min-width:0}",
      ".tc-statKey{font-size:10.5px;letter-spacing:.4px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}",
      ".tc-statVal{font-size:15px;font-weight:700;line-height:1.25;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".tc-statVal[data-accent]{color:var(--dsw-alias-state-warn-primary, #d99b18)}",
      ".tc-summary{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}",
      ".tc-summaryStrong{font-weight:700;color:var(--dsw-alias-state-warn-primary, #d99b18)}",
      ".tc-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.7;overflow-wrap:anywhere}",
      ".tc-detail{border:1px solid var(--tc-line);border-radius:12px;padding:12px 14px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent)}",
      ".tc-detailTitle{margin:0;font-size:13.5px;font-weight:700}",
      ".tc-table{border-collapse:collapse;width:100%;font-size:12px}",
      ".tc-table th{padding:6px;border-bottom:1px solid var(--tc-line);color:var(--dsw-alias-label-tertiary);font-weight:600;font-size:10.5px;letter-spacing:.4px;text-align:left;white-space:nowrap}",
      ".tc-table td{padding:5px 6px;border-bottom:1px solid var(--tc-line-soft);vertical-align:top;font-variant-numeric:tabular-nums}",
      ".tc-sub{display:block;font-size:10.5px;color:var(--dsw-alias-label-tertiary);line-height:1.3}",
      ".tc-table tbody tr:last-child td{border-bottom:none}",
      ".tc-table tbody tr:hover td{background:var(--tc-fill)}",
      ".tc-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".tc-empty{padding:26px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:1.7}",
      ".tc-notice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent);border-radius:9px;padding:9px 12px;font-size:12.5px;line-height:1.5;overflow-wrap:anywhere;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent)}",
    ].join("");

    /** Install the stylesheet once and return its disposer. */
    function installStyles() {
      const tagId = "dsh-token-calendar/panel.css";
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
      "entry.label": "Token 日历",
      "panel.title": "Token 消耗日历",
      "panel.back": "返回对话",
      "common.loading": "加载中…",
      "common.refresh": "刷新",
      "common.today": "本月",
      "common.none": "无",
      "filter.agent": "代理",
      "filter.all": "全部代理",
      "filter.currency": "货币",
      "summary.total": "本月合计",
      "summary.tokens": "tokens",
      "summary.requests": "次请求",
      "summary.activeDays": "个活跃日",
      "summary.credits": "套餐额度",
      "stats.cost": "花费",
      "stats.tokens": "tokens",
      "stats.requests": "请求",
      "stats.days": "活跃日",
      "stats.credits": "套餐额度",
      "legend.less": "少",
      "legend.more": "多",
      "cell.noData": "无请求",
      "detail.title": "当日明细",
      "detail.close": "关闭",
      "detail.models": "模型",
      "detail.providers": "供应商",
      "detail.provider": "供应商",
      "detail.model": "模型",
      "detail.requests": "请求",
      "detail.tokens": "tokens",
      "detail.cost": "花费",
      "detail.errors": "失败请求",
      "detail.none": "当天没有请求。",
      "meta.source": "数据源",
      "meta.records": "条记录",
      "meta.range": "覆盖区间",
      "meta.fx": "汇率",
      "meta.updated": "更新于",
      "meta.estimated": "估算金额占比",
      "meta.estimatedHint": "这些金额按其他供应商的单价估算（该供应商不在价格表内）。",
      "empty.noData": "这个月还没有 magpie 请求记录。",
      "empty.noLedger": "没有找到 magpie 的请求流水文件。",
      "hint.clickDay": "点击某一天查看模型与供应商明细。",
      "weekday": ["一", "二", "三", "四", "五", "六", "日"],
    };

    const en = {
      "entry.label": "Token Calendar",
      "panel.title": "Token Consumption Calendar",
      "panel.back": "Back to conversation",
      "common.loading": "Loading…",
      "common.refresh": "Refresh",
      "common.today": "This month",
      "common.none": "none",
      "filter.agent": "Agent",
      "filter.all": "All agents",
      "filter.currency": "Currency",
      "summary.total": "Month total",
      "summary.tokens": "tokens",
      "summary.requests": "requests",
      "summary.activeDays": "active days",
      "summary.credits": "plan credits",
      "stats.cost": "Spend",
      "stats.tokens": "Tokens",
      "stats.requests": "Requests",
      "stats.days": "Active days",
      "stats.credits": "Plan credits",
      "legend.less": "less",
      "legend.more": "more",
      "cell.noData": "no requests",
      "detail.title": "Day detail",
      "detail.close": "Close",
      "detail.models": "Models",
      "detail.providers": "Providers",
      "detail.provider": "Provider",
      "detail.model": "Model",
      "detail.requests": "Requests",
      "detail.tokens": "Tokens",
      "detail.cost": "Cost",
      "detail.errors": "failed requests",
      "detail.none": "No requests on that day.",
      "meta.source": "Source",
      "meta.records": "records",
      "meta.range": "coverage",
      "meta.fx": "fx",
      "meta.updated": "updated",
      "meta.estimated": "estimated share",
      "meta.estimatedHint": "These amounts use another provider's list price (the provider is not in the catalog).",
      "empty.noData": "No magpie requests recorded in this month.",
      "empty.noLedger": "The magpie request ledger was not found.",
      "hint.clickDay": "Click a day for its model and provider breakdown.",
      "weekday": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    };
    // #endregion

    // #region helpers
    /**
     * The month key of today in the browser's timezone.
     * @returns {string} a `YYYY-MM` key.
     */
    function currentMonth() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    /**
     * Shift a month key by whole months.
     * @param {string} month - a `YYYY-MM` key.
     * @param {number} delta - months to add.
     * @returns {string} the shifted month key.
     */
    function shiftMonth(month, delta) {
      const parts = month.split("-");
      const year = Number(parts[0]);
      const index = Number(parts[1]) - 1 + delta;
      const date = new Date(Date.UTC(year, index, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    /**
     * Format a token count with three significant digits.
     * @param {number} value - the token count.
     * @returns {string} the formatted number.
     */
    function formatTokens(value) {
      const count = Number(value) || 0;
      if (Math.abs(count) >= 1e9) return `${trim(count / 1e9)}B`;
      if (Math.abs(count) >= 1e6) return `${trim(count / 1e6)}M`;
      if (Math.abs(count) >= 1e3) return `${trim(count / 1e3)}K`;
      return String(Math.round(count));
    }

    /**
     * Round to three significant digits and drop trailing zeros.
     * @param {number} value - the value.
     * @returns {string} the formatted number.
     */
    function trim(value) {
      if (!Number.isFinite(value) || value === 0) return "0";
      const exponent = Math.floor(Math.log10(Math.abs(value)));
      const factor = 10 ** (2 - exponent);
      return String(Math.round(value * factor) / factor);
    }

    /**
     * Format a money amount.
     * @param {number} value - the amount.
     * @param {string} currency - `cny` or `usd`.
     * @returns {string} the formatted amount.
     */
    function formatMoney(value, currency) {
      const amount = Number(value) || 0;
      const symbol = currency === "usd" ? "$" : "¥";
      return symbol + amount.toFixed(2);
    }

    /**
     * The amount of a day in the display currency.
     * @param {object} day - the day row.
     * @param {string} currency - `cny` or `usd`.
     * @returns {number} the amount.
     */
    function dayAmount(day, currency) {
      return currency === "usd" ? Number(day.costUsd || 0) : Number(day.costCny || 0);
    }

    /**
     * The heat level of a day against the busiest day of the month.
     * @param {number} value - the day's amount.
     * @param {number} max - the month's largest amount.
     * @returns {number} a level between 0 and 1.
     */
    function heatLevel(value, max) {
      if (!(max > 0) || !(value > 0)) return 0;
      return Math.min(1, Math.sqrt(value / max));
    }

    /**
     * The local date key of today.
     * @returns {string} a `YYYY-MM-DD` key.
     */
    function todayKey() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    // #endregion

    // #region data
    /**
     * Load one month of calendar data.
     * @param {string} month - the `YYYY-MM` key.
     * @param {string} agent - the agent filter.
     * @param {number} nonce - a counter that forces a reload.
     * @returns {Promise<object>} the month payload.
     */
    async function loadMonth(month, agent, nonce) {
      const params = new URLSearchParams();
      params.set("month", month);
      if (agent && agent !== "all") params.set("agent", agent);
      if (nonce > 0) params.set("force", "1");
      const response = await fetch(`${API}/month?${params.toString()}`, { headers: { accept: "application/json" } });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${response.status} ${detail.slice(0, 200)}`);
      }
      return response.json();
    }
    // #endregion

    // #region components
    /**
     * One day cell.
     * @param {{day: object, level: number, selected: boolean, today: boolean, currency: string, onSelect: (date: string) => void}} props - the cell props.
     * @returns {object} the element.
     */
    function DayCell(props) {
      const day = props.day;
      const hasTraffic = day.requests > 0;
      const level = props.level;
      const style = hasTraffic
        ? {
          background: `color-mix(in srgb, var(--tc-accent) ${(8 + 26 * level).toFixed(1)}%, var(--tc-fill))`,
          borderColor: `color-mix(in srgb, var(--tc-accent) ${(22 + 46 * level).toFixed(1)}%, transparent)`,
        }
        : undefined;
      const title = hasTraffic
        ? `${day.date}\n${day.requests} req\n${formatTokens(day.tokens)} tokens\n${formatMoney(dayAmount(day, props.currency), props.currency)}`
        : `${day.date}\n${props.noDataLabel}`;
      return h(
        "button",
        {
          type: "button",
          className: "tc-cell",
          style,
          title,
          "data-selected": props.selected ? "" : undefined,
          "data-today": props.today ? "" : undefined,
          "data-hot": hasTraffic && level > 0.35 ? "" : undefined,
          "data-empty": hasTraffic ? undefined : "",
          onClick: () => props.onSelect(day.date),
        },
        h("span", { className: "tc-dayNum" }, String(day.day)),
        hasTraffic ? h("span", { className: "tc-cost" }, formatMoney(dayAmount(day, props.currency), props.currency)) : null,
        hasTraffic ? h("span", { className: "tc-tokens" }, formatTokens(day.tokens)) : null
      );
    }

    /**
     * The month calendar: weekday header plus the day grid, in one centered
     * block so a wide panel does not stretch the cells into flat rectangles.
     * @param {{data: object, currency: string, selected: string|null, onSelect: (date: string) => void, weekdayLabels: string[]}} props - the calendar props.
     * @returns {object} the element.
     */
    function Calendar(props) {
      const data = props.data;
      const days = data.days || [];
      const amounts = days.map(day => dayAmount(day, props.currency));
      const max = amounts.reduce((best, value) => (value > best ? value : best), 0);
      const today = todayKey();
      const cells = [];
      for (let index = 0; index < data.firstWeekday; index += 1) {
        cells.push(h("div", { key: `pad-${index}`, className: "tc-cell", style: { visibility: "hidden" } }));
      }
      for (const day of days) {
        cells.push(h(DayCell, {
          key: day.date,
          day,
          level: heatLevel(dayAmount(day, props.currency), max),
          selected: props.selected === day.date,
          today: day.date === today,
          currency: props.currency,
          noDataLabel: props.noDataLabel,
          onSelect: props.onSelect,
        }));
      }
      return h(
        "div",
        { className: "tc-calWrap" },
        h(
          "div",
          { className: "tc-weekdays" },
          props.weekdayLabels.map(label => h("div", { key: label, className: "tc-weekday" }, label))
        ),
        h("div", { className: "tc-grid" }, cells),
        max > 0 ? legendSwatches(props.legendLabels) : null
      );
    }

    /**
     * The heat legend: five swatches from the palest to the busiest day.
     * The calendar renders this row itself, so the labels arrive as props.
     * @param {string[]} labels - the min and max labels.
     * @returns {object} the element.
     */
    function legendSwatches(labels) {
      return h(
        "div",
        { className: "tc-legend" },
        h("span", null, labels[0]),
        h(
          "span",
          { className: "tc-swatches" },
          [0, 0.25, 0.5, 0.75, 1].map(level => h("span", {
            key: level,
            className: "tc-swatch",
            style: {
              background: `color-mix(in srgb, var(--tc-accent) ${(8 + 26 * level).toFixed(1)}%, var(--tc-fill))`,
              borderColor: `color-mix(in srgb, var(--tc-accent) ${(22 + 46 * level).toFixed(1)}%, transparent)`,
            },
          }))
        ),
        h("span", null, labels[1])
      );
    }

    /**
     * The sidebar glyph.
     * @param {{size: number, active: boolean}} props - the owner props.
     * @returns {object} the element.
     */
    function SidebarGlyph(props) {
      const size = typeof props.size === "number" && props.size > 0 ? props.size : 20;
      const color = props.active ? "var(--dsw-alias-state-business-primary)" : "currentColor";
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
        h("rect", { x: 3, y: 4.5, width: 18, height: 16, rx: 3 }),
        h("path", { d: "M3 9.5h18M8 2.5v4M16 2.5v4" }),
        h("path", { d: "M7.5 14.5h3M7.5 17.5h6" }),
        h("path", { d: "M13.5 13.5v2.5" })
      );
    }

    /**
     * The panel.
     * @param {{t: (key: string) => string}} props - the injected props.
     * @returns {object} the element.
     */
    function Panel(props) {
      const t = props.t;
      const [month, setMonth] = react.useState(currentMonth());
      const [agent, setAgent] = react.useState("all");
      const [currency, setCurrency] = react.useState("cny");
      const [nonce, setNonce] = react.useState(0);
      const [data, setData] = react.useState(null);
      const [error, setError] = react.useState("");
      const [loading, setLoading] = react.useState(true);
      const [selected, setSelected] = react.useState(null);

      react.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadMonth(month, agent, nonce)
          .then(payload => {
            if (cancelled) return;
            setData(payload);
            setError("");
            if (payload && payload.currency === "usd") setCurrency("usd");
          })
          .catch(failure => {
            if (cancelled) return;
            setError(String(failure && failure.message ? failure.message : failure));
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
        return () => { cancelled = true; };
      }, [month, agent, nonce]);

      const meta = data && data.meta ? data.meta : null;
      const totals = data && data.totals ? data.totals : null;
      const weekdayLabels = t("weekday");
      const selectedDay = data && data.days
        ? data.days.find(day => day.date === selected) || null
        : null;

      const header = h(
        "div",
        { className: "tc-header" },
        h("button", { type: "button", className: "tc-btn", title: t("panel.back"), onClick: props.onBack }, "‹"),
        h("h2", { className: "tc-title" }, t("panel.title")),
        h(
          "div",
          { className: "tc-nav" },
          h("button", { type: "button", className: "tc-btn", onClick: () => setMonth(shiftMonth(month, -1)), "aria-label": "previous month" }, "‹"),
          h("input", {
            type: "month",
            className: "tc-month",
            value: month,
            onChange: event => {
              const value = event.target.value;
              if (/^\d{4}-\d{2}$/.test(value)) setMonth(value);
            },
          }),
          h("button", { type: "button", className: "tc-btn", onClick: () => setMonth(shiftMonth(month, 1)), "aria-label": "next month" }, "›"),
          month === currentMonth()
            ? null
            : h("button", { type: "button", className: "tc-btn", onClick: () => setMonth(currentMonth()) }, t("common.today"))
        ),
        h("button", { type: "button", className: "tc-btn", disabled: loading, onClick: () => setNonce(value => value + 1) }, t("common.refresh"))
      );

      const agentOptions = meta && meta.agents ? meta.agents : [];
      const toolbar = h(
        "div",
        { className: "tc-toolbar" },
        h("span", { className: "tc-meta" }, t("filter.agent")),
        h(
          "select",
          { className: "tc-select", value: agent, onChange: event => setAgent(event.target.value) },
          h("option", { value: "all" }, t("filter.all")),
          agentOptions.map(name => h("option", { key: name, value: name }, name))
        ),
        h("span", { className: "tc-spacer" }),
        h("span", { className: "tc-meta" }, t("filter.currency")),
        h(
          "select",
          { className: "tc-select", value: currency, onChange: event => setCurrency(event.target.value) },
          h("option", { value: "cny" }, "¥ CNY"),
          h("option", { value: "usd" }, "$ USD")
        )
      );

      const statCards = totals
        ? h(
          "div",
          { className: "tc-stats" },
          h(
            "div",
            { className: "tc-stat" },
            h("span", { className: "tc-statKey" }, t("stats.cost")),
            h("span", { className: "tc-statVal", "data-accent": "" }, formatMoney(currency === "usd" ? totals.costUsd : totals.costCny, currency))
          ),
          h(
            "div",
            { className: "tc-stat" },
            h("span", { className: "tc-statKey" }, t("stats.tokens")),
            h("span", { className: "tc-statVal" }, formatTokens(totals.tokens))
          ),
          h(
            "div",
            { className: "tc-stat" },
            h("span", { className: "tc-statKey" }, t("stats.requests")),
            h("span", { className: "tc-statVal" }, String(totals.requests))
          ),
          h(
            "div",
            { className: "tc-stat" },
            h("span", { className: "tc-statKey" }, totals.credits > 0 ? t("stats.credits") : t("stats.days")),
            h("span", { className: "tc-statVal" }, totals.credits > 0 ? trim(totals.credits) : String(totals.activeDays))
          )
        )
        : null;

      const detail = selectedDay
        ? h(
          "div",
          { className: "tc-detail" },
          h(
            "div",
            { className: "tc-toolbar" },
            h("h3", { className: "tc-detailTitle" }, t("detail.title"), " ", selectedDay.date),
            h("span", { className: "tc-spacer" }),
            h("button", { type: "button", className: "tc-btn", onClick: () => setSelected(null) }, t("detail.close"))
          ),
          h(
            "div",
            { className: "tc-summary" },
            h("span", null, formatTokens(selectedDay.tokens), " ", t("summary.tokens")),
            h("span", null, "· "),
            h("span", null, selectedDay.requests, " ", t("summary.requests")),
            h("span", null, "· "),
            h("span", { className: "tc-summaryStrong" }, formatMoney(dayAmount(selectedDay, currency), currency)),
            selectedDay.credits > 0 ? h("span", null, "· " + selectedDay.credits.toFixed(1) + " " + t("summary.credits")) : null,
            selectedDay.errors > 0 ? h("span", null, "· " + selectedDay.errors + " " + t("detail.errors")) : null
          ),
          selectedDay.models.length > 0
            ? h(
              "table",
              { className: "tc-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", null, t("detail.model")),
                  h("th", null, t("detail.requests")),
                  h("th", null, t("detail.tokens")),
                  h("th", null, t("detail.cost"))
                )
              ),
              h(
                "tbody",
                null,
                selectedDay.models.map(model => h(
                  "tr",
                  { key: `${model.provider}/${model.model}` },
                  h(
                    "td",
                    null,
                    h("span", null, model.model || model.provider),
                    h("span", { className: "tc-sub" }, model.provider)
                  ),
                  h("td", null, String(model.requests)),
                  h("td", null, formatTokens(model.tokens)),
                  h("td", null, formatMoney(model.costUsd * (meta ? meta.fxRate : 1), currency))
                ))
              )
            )
            : h("div", { className: "tc-meta" }, t("detail.none"))
        )
        : null;

      const sourceLine = meta
        ? h(
          "div",
          { className: "tc-meta" },
          h("div", null, `${t("meta.source")}: ${meta.paths ? meta.paths.usage : "-"}`),
          h("div", null, `${meta.ledger ? meta.ledger.records : 0} ${t("meta.records")} · ${t("meta.fx")} ${meta.fxRate}${meta.fxAt ? ` @ ${meta.fxAt}` : ""}`),
          totals && totals.estimatedShare > 0
            ? h("div", null, `${t("meta.estimated")}: ${Math.round(totals.estimatedShare * 100)}% — ${t("meta.estimatedHint")}`)
            : null,
          h("div", null, t("hint.clickDay"))
        )
        : null;

      const body = data === null
        ? h("div", { className: "tc-empty" }, t("common.loading"))
        : h(
          "div",
          { className: "tc-stack" },
          h(Calendar, {
            data,
            currency,
            selected,
            onSelect: setSelected,
            weekdayLabels,
            noDataLabel: t("cell.noData"),
            legendLabels: [t("legend.less"), t("legend.more")],
          }),
          statCards,
          data.days.every(day => day.requests === 0)
            ? h("div", { className: "tc-meta" }, t("empty.noData"))
            : null,
          detail,
          sourceLine
        );

      return h(
        "div",
        { className: "tc-panel" },
        header,
        toolbar,
        h(
          "div",
          { className: "tc-scroll" },
          error !== "" ? h("div", { className: "tc-notice" }, error) : null,
          body
        )
      );
    }
    // #endregion

    /** Register the sidebar entry and the panel it opens. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-token-calendar: dictionaries");
      ctx.effect(() => installStyles(), "dsh-token-calendar: styles");
      const t = ctx.locale.bind(NS);

      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
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
