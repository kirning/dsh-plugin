window.__ModuleLoader__.load({
  id: "dsh-devops-tasks",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");

    /** Shorthand for React.createElement (this module ships unbuilt). */
    const h = react.createElement;

    /** Resolve a module from the shell's frozen platform table, if present. */
    function platformModule(id) {
      try {
        return require(id);
      } catch {
        return undefined;
      }
    }

    // The shell owns this module; asking for it is the only way to paint the
    // same status dots (and the same running animation) the sidebar uses.
    const primitives = platformModule("@deepseek-ai/dsh-client-ui-primitives");

    /** Locale namespace, panel id, and the host route this panel reads. */
    const NS = "dsh-devops-tasks";
    const PANEL_ID = "devops-tasks";
    const API = "/api/dsh-devops-tasks";

    // #region styles
    const CSS = [
      ".dt-panel{position:relative;display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;min-width:0;padding:14px 16px 16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}",
      ".dt-header{display:flex;flex:none;align-items:center;gap:10px}",
      ".dt-title{flex:1;margin:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dt-badge{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:1px 8px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:nowrap}",
      ".dt-badge[data-state=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".dt-badge[data-state=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".dt-badge[data-state=err]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".dt-seg{display:inline-flex;flex:none;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}",
      ".dt-segBtn{background:none;border:none;border-radius:7px;padding:4px 12px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}",
      ".dt-segBtn:hover{color:var(--dsw-alias-label-primary)}",
      ".dt-segBtn[data-active]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600}",
      ".dt-tiles{display:grid;flex:none;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}",
      ".dt-tile{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;text-align:left;font-family:inherit;color:inherit}",
      ".dt-tile:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-tile[data-active]{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}",
      ".dt-tile[data-static]{cursor:default}",
      ".dt-tile[data-static]:hover{background:var(--dsw-alias-bg-layer-2)}",
      ".dt-tile[data-tone='accent'] .dt-tileValue{color:var(--dsw-alias-state-business-primary)}",
      ".dt-tileTop{display:flex;align-items:baseline;gap:8px}",
      ".dt-tileLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}",
      ".dt-tileValue{font-size:20px;font-weight:700;line-height:1.2}",
      ".dt-tileHint{font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}",
      ".dt-toolbar{display:flex;flex:none;flex-wrap:wrap;align-items:center;gap:8px}",
      ".dt-spacer{flex:1}",
      ".dt-input{background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:13px;color:var(--dsw-alias-label-primary);outline:none;min-width:180px}",
      ".dt-input:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".dt-input::placeholder{color:var(--dsw-alias-label-tertiary)}",
      ".dt-select{background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 8px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary);outline:none;max-width:220px}",
      ".dt-btn{background:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 12px;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}",
      ".dt-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-btn:disabled{opacity:.45;cursor:default}",
      ".dt-btn[data-active]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary)}",
      ".dt-body{display:flex;flex:1;flex-direction:column;gap:10px;min-height:0;overflow-y:auto}",
      ".dt-tableWrap{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:auto}",
      ".dt-table{border-collapse:collapse;width:100%;font-size:12.5px}",
      ".dt-table th{position:sticky;top:0;z-index:1;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;text-align:left;white-space:nowrap}",
      ".dt-table td{padding:7px 10px;border-bottom:1px solid var(--dsw-alias-separator-primary);vertical-align:middle}",
      ".dt-table tbody tr:last-child td{border-bottom:none}",
      ".dt-table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-sortBtn{display:inline-flex;align-items:center;gap:4px;background:none;border:none;margin:0;padding:0;font:inherit;color:inherit;cursor:pointer}",
      ".dt-sortBtn:hover{color:var(--dsw-alias-label-primary)}",
      ".dt-sortBtn[data-active]{color:var(--dsw-alias-state-business-primary)}",
      ".dt-sortMark{font-size:10px;line-height:1;opacity:.45}",
      ".dt-sortBtn[data-active] .dt-sortMark{opacity:1}",
      // A draggable right edge per header cell, and the title button that opens
      // the detail dialog.
      ".dt-table th{padding-right:16px}",
      ".dt-colResize{position:absolute;top:0;right:0;z-index:2;width:7px;height:100%;cursor:col-resize;user-select:none}",
      ".dt-colResize:hover,.dt-colResize:active{background:var(--dsw-alias-state-business-primary);opacity:.5}",
      ".dt-titleBtn{display:block;width:100%;background:none;border:none;margin:0;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;overflow-wrap:anywhere}",
      ".dt-titleBtn:hover{color:var(--dsw-alias-state-business-primary);text-decoration:underline}",
      ".dt-person{display:inline-block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}",
      // The detail dialog: two tabs over one scrollable body.
      ".dt-modalMask{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.42)}",
      ".dt-modal{display:flex;flex-direction:column;width:min(880px,94vw);max-height:min(84vh,760px);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 20px 60px rgba(0,0,0,.38);overflow:hidden}",
      ".dt-modalHead{display:flex;flex:none;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);min-width:0}",
      ".dt-modalId{flex:none}", ".dt-modalTitle{flex:0 1 auto;margin:0;font-size:14px;font-weight:700;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dt-modalHead .dt-idBtn,.dt-modalHead a.dt-idBtn{flex:none}",
      ".dt-modalTabs{display:flex;flex:none;gap:2px;padding:8px 16px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".dt-modalTab{background:none;border:none;border-bottom:2px solid transparent;padding:6px 12px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".dt-modalTab:hover{color:var(--dsw-alias-label-primary)}",
      ".dt-modalTab[data-active]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary);font-weight:600}",
      ".dt-modalBody{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:12px}",
      ".dt-group{display:flex;flex-direction:column;gap:6px}",
      ".dt-groupTitle{font-size:12px;font-weight:700;color:var(--dsw-alias-label-secondary)}",
      ".dt-groupRow{display:flex;align-items:flex-start;gap:10px;font-size:12.5px;line-height:1.55;padding:3px 0;border-bottom:1px dashed var(--dsw-alias-separator-primary)}",
      ".dt-groupRow:last-child{border-bottom:none}",
      ".dt-groupName{flex:0 0 132px;color:var(--dsw-alias-label-tertiary)}",
      ".dt-groupValue{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap}",
      ".dt-logRow{display:flex;align-items:flex-start;gap:10px;padding:6px 0}",
      ".dt-logAvatar{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);font-size:12px;color:var(--dsw-alias-label-secondary)}",
      ".dt-logBody{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}",
      ".dt-logHead{display:flex;align-items:baseline;gap:8px;min-width:0}",
      ".dt-logUser{font-size:12.5px;font-weight:600}",
      ".dt-logTime{font-size:11.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}",
      ".dt-logItem{font-size:12.5px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}",
      ".dt-logValues{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}",
      ".dt-logBefore{text-decoration:line-through;opacity:.7;overflow-wrap:anywhere}",
      ".dt-logArrow{opacity:.6}",
      ".dt-logAfter{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}",
      ".dt-logTag{display:inline-block;flex:none;margin-top:2px;font-size:10.5px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px;line-height:1.6;width:max-content}",
      ".dt-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".dt-muted{color:var(--dsw-alias-label-tertiary)}",
      ".dt-num{font-variant-numeric:tabular-nums}",
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
      "a.dt-idBtn{text-decoration:none}",
      ".dt-picker{position:relative}",
      ".dt-pickerMenu{position:absolute;top:calc(100% + 4px);left:0;z-index:40;min-width:230px;max-height:260px;overflow-y:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:4px}",
      ".dt-pickerItem{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}",
      ".dt-pickerItem input{accent-color:var(--dsw-alias-state-business-primary);cursor:pointer}",
      ".dt-pickerHead{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--dsw-alias-separator-primary);padding-bottom:6px;margin-bottom:2px}",
      ".dt-pickerHead .dt-btn{padding:2px 8px;font-size:11.5px}",
      ".dt-spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--dsw-alias-state-business-primary);border-top-color:transparent;border-radius:50%;vertical-align:-1px;animation:dt-spin .8s linear infinite}",
      "@keyframes dt-spin{to{transform:rotate(360deg)}}",
      ".dt-footer{flex:none;font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}",
      // Sessions tab: a responsive grid of cards.
      ".dt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:10px;align-content:start}",
      ".dt-card{position:relative;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;min-width:0;text-align:left;font-family:inherit;color:inherit}",
      ".dt-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}",
      ".dt-card:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
      ".dt-card[data-current]{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}",
      ".dt-cardTop{display:flex;align-items:center;gap:6px;min-height:20px;min-width:0}",
      ".dt-status{display:inline-flex;flex:none;align-items:center;justify-content:center;width:14px;height:14px;color:var(--dsw-alias-label-tertiary)}",
      ".dt-status[data-state=ongoing]{color:var(--dsw-alias-state-business-primary)}",
      ".dt-status[data-state=warning]{color:var(--dsw-alias-state-warn-primary)}",
      ".dt-status[data-state=done]{color:var(--dsw-alias-state-success-primary)}",
      ".dt-cardTitle{flex:1;min-width:0;margin:0;font-size:13px;font-weight:600;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}",
      ".dt-cardNote{display:-webkit-box;width:100%;box-sizing:border-box;min-height:18px;margin:0;padding:2px 4px;border:1px dashed transparent;border-radius:6px;background:none;font-family:inherit;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);text-align:left;cursor:text;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}",
      ".dt-cardNote:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-cardNote[data-empty]{color:var(--dsw-alias-label-tertiary);font-style:italic;opacity:0;transition:opacity .12s ease}",
      ".dt-card:hover .dt-cardNote[data-empty],.dt-card:focus-within .dt-cardNote[data-empty]{opacity:.6}",
      ".dt-noteInput{width:100%;box-sizing:border-box;resize:vertical;min-height:44px;padding:4px 6px;border:1px solid var(--dsw-alias-state-business-primary);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;line-height:1.5;outline:none}",
      ".dt-cardMeta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-tertiary);min-width:0;white-space:nowrap;overflow:hidden}",
      // Card anatomy: top (status + title + pin), middle (note + figures), bottom.
      // The figures sit at the bottom-left of the card's middle band, so they
      // line up with the title and note above them instead of floating inward.
      ".dt-cardFigs{display:flex;align-items:center;gap:6px;margin-top:auto;padding-left:0;font-size:11px;color:var(--dsw-alias-label-tertiary);min-width:0;white-space:nowrap;overflow:hidden}",
      ".dt-cardMid{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0}",
      ".dt-cardBottom{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:2px;min-width:0;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
      ".dt-card[data-highlight]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}",
      ".dt-pager{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}",
      ".dt-ws-wrap{display:inline-flex;flex:none;align-items:center;gap:4px;min-width:0;max-width:52%}",
      ".dt-ws{min-width:0;overflow:hidden;text-overflow:ellipsis}",
      ".dt-metaItem{flex:none;font-variant-numeric:tabular-nums}",
      ".dt-metaSep{flex:none;opacity:.6}",
      ".dt-metaTime{flex:none;margin-left:auto;padding-left:4px}",
      "[data-dt-locate]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px;border-radius:8px;animation:dt-pulse 1.8s ease-out}",
      "@keyframes dt-pulse{0%{background:var(--dsw-alias-state-business-primary);opacity:.5}100%{background:transparent;opacity:1}}",
      ".dt-cardBtns{display:flex;align-items:center;gap:2px;margin-left:auto}",
      ".dt-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:none;border-radius:6px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:.55;transition:opacity .12s,background .12s,color .12s}",
      ".dt-card:hover .dt-iconBtn,.dt-card:focus-within .dt-iconBtn,.dt-iconBtn[data-on]{opacity:1}",
      // The pin stays a hover action until the session is actually pinned.
      ".dt-iconBtn.dt-pin:not([data-on]){opacity:0}",
      ".dt-card:hover .dt-iconBtn.dt-pin,.dt-card:focus-within .dt-iconBtn.dt-pin{opacity:1}",
      ".dt-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".dt-iconBtn[data-on]{color:var(--dsw-alias-state-business-primary)}",
      ".dt-menu{position:absolute;right:8px;top:34px;z-index:20;min-width:158px;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 8px 24px rgba(0,0,0,.28);display:flex;flex-direction:column;cursor:default}",
      ".dt-menuItem{display:block;width:100%;text-align:left;background:none;border:none;border-radius:6px;padding:6px 8px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}",
      ".dt-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".dt-menuItem[data-danger]{color:var(--dsw-alias-state-error-primary)}",
      ".dt-menuSep{height:1px;margin:4px 2px;background:var(--dsw-alias-separator-primary)}",
      ".dt-overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.36)}",
      ".dt-dialog{width:min(420px,92vw);padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px;box-shadow:0 16px 48px rgba(0,0,0,.32)}",
      ".dt-dialogTitle{margin:0;font-size:14px;font-weight:700}",
      ".dt-dialogBody{font-size:12.5px;color:var(--dsw-alias-label-secondary);line-height:1.6;overflow-wrap:anywhere}",
      ".dt-dialogRow{display:flex;justify-content:flex-end;gap:8px}",
      ".dt-chatDialog{width:min(480px,92vw)}",
      ".dt-chatText{width:100%;box-sizing:border-box;min-height:96px;resize:vertical;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.5}",
      ".dt-btn[data-primary]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}",
      ".dt-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:40;max-width:80%;padding:6px 14px;border-radius:999px;border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2);font-size:12px;overflow-wrap:anywhere}",
      ".dt-toast[data-kind=ok]{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}",
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
      "entry.label": "我的工作台",
      "panel.title": "我的工作台",
      "panel.back": "返回对话",
      "tab.sessions": "会话管理",
      "tab.devops": "Devops 管理",
      "common.loading": "加载中…",
      "common.refresh": "刷新",
      "common.search": "搜索编号或标题",
      "common.copy": "复制",
      "common.copied": "已复制编号",
      "common.none": "-",
      "tab.todo": "待办",
      "tab.review": "待审",
      "tab.created": "我创建的",
      "tab.all": "全部",
      "count.todo": "待办",
      "count.review": "待审",
      "count.created": "我创建的",
      "count.all": "全部",
      "count.empty": "暂无",
      "count.allHint": "待办、待审与我创建的合计",
      "col.id": "编号",
      "col.title": "标题",
      "col.type": "类型",
      "col.status": "状态",
      "col.priority": "优先级",
      "col.points": "任务点数",
      "col.end": "截止",
      "col.system": "所属系统",
      "col.reviewKind": "评审类型",
      "col.creator": "创建人",
      "col.devOwner": "开发负责人",
      "col.testOwner": "测试负责人",
      "col.owner": "责任人",
      "col.resize": "拖动调整列宽，双击恢复默认",
      "col.openModal": "查看详细信息与活动日志",
      "empty.todo": "没有待办事项。",
      "empty.review": "没有等待你评审的事项。",
      "empty.created": "你最近没有创建的事项。",
      "empty.search": "没有匹配的条目。",
      "empty.all": "没有关于你的事项。",
      "hint.all": "待办、待审与我创建的合并在一起；点击编号在 DevOps 网页打开。",
      "hint.todo": "按截止日期从近到远排列；点击编号在 DevOps 网页打开。",
      "hint.review": "汇总各类等待你评审的事项。",
      "hint.created": "你创建的缺陷、需求、故事与任务（含已完结）。",
      "filter.status": "状态",
      "filter.type": "类型",
      "filter.all": "全部",
      "filter.system": "所属系统",
      "filter.systemAll": "全选",
      "filter.systemClear": "清空",
      "filter.systemCount": "已选 {n}/{m}",
      "filter.systemEmpty": "只显示勾选的系统，当前没有勾选。",
      "filter.statusCount": "已选 {n}/{m}",
      "filter.statusEmpty": "只显示勾选的状态，当前没有勾选。",
      "filter.typeCount": "已选 {n}/{m}",
      "filter.typeEmpty": "只显示勾选的类型，当前没有勾选。",
      "filter.typeNone": "未分类",
      "pager.size": "每页条数",
      "pager.sizeOption": "{n} 条/页",
      "pager.prev": "上一页",
      "pager.next": "下一页",
      "pager.info": "第 {page}/{pages} 页 · 共 {n} 条",
      "tile.points": "任务点数",
      "tile.pointsHint": "全部任务的合计，不受筛选影响",
      "tile.pointsHintMonth": "{month} 创建的任务合计",
      "tile.pointsNone": "暂无可统计的任务",
      "sort.pointsDesc": "按任务点数从多到少排序",
      "sort.pointsAsc": "按任务点数从少到多排序",
      "sort.pointsClear": "已取消排序，点击恢复从多到少",
      "col.openDetail": "在 DevOps 网页打开",
      "filter.reset": "重置筛选",
      "filter.month": "创建年月",
      "filter.monthAny": "全部年月",
      "filter.monthEmpty": "没有可选的年月",
      "modal.detail": "详细信息",
      "modal.log": "活动日志",
      "modal.group.basic": "基本信息",
      "modal.group.people": "人员信息",
      "modal.group.plan": "优先级与计划",
      "modal.group.desc": "描述",
      "modal.openWeb": "在 DevOps 网页打开",
      "modal.close": "关闭",
      "modal.loading": "正在读取…",
      "modal.error": "读取失败：{message}",
      "modal.empty": "没有可显示的字段。",
      "modal.logEmpty": "这条事项还没有活动记录。",
      "modal.more": "加载更多",
      "modal.moreLoading": "正在加载…",
      "modal.before": "原值",
      "modal.after": "新值",
      "modal.autoFlow": "状态流转自动触发",
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
      // Sessions tab.
      "sess.empty": "本机还没有任何会话。",
      "sess.emptyFilter": "当前筛选下没有会话。",
      "sess.untitled": "未命名会话",
      "sess.ungrouped": "未分组",
      "sess.allWorkspaces": "全部工作区",
      "sess.filterWorkspace": "工作区",
      "sess.search": "搜索会话标题",
      "sess.running": "执行任务中",
      "sess.waitingApproval": "待审批",
      "sess.planReview": "计划待审",
      "sess.waitingAnswer": "待回答",
      "sess.completed": "执行完成",
      "sess.idle": "没有任务",
      "sess.pin": "置顶",
      "sess.unpin": "取消置顶",
      "sess.pinned": "已置顶",
      "sess.rename": "重命名",
      "sess.fork": "分叉会话",
      "sess.copyId": "复制 Session ID",
      "sess.openInApp": "在应用打开",
      "sess.archive": "归档会话",
      "sess.unarchive": "取消归档",
      "sess.renameTitle": "重命名会话",
      "sess.renamePlaceholder": "会话标题",
      "sess.ok": "确定",
      "sess.cancel": "取消",
      "sess.archiveConfirmTitle": "停止并归档此会话？",
      "sess.archiveConfirmBody": "“{title}” 仍在执行，归档会先停止它的工作。归档后可在侧栏「全部对话」里恢复。",
      "sess.archiveConfirm": "停止并归档",
      "sess.copied": "Session ID 已复制",
      "sess.copyFailed": "复制失败，请重试",
      "sess.openFailed": "无法打开：{message}",
      "sess.actionFailed": "操作失败：{message}",
      "sess.openSession": "打开会话",
      "sess.actions": "更多操作",
      "sess.hint": "置顶会话排在最前，其余按最近使用时间排序。",
      "sess.count": "共 {n} 个会话",
      "sess.highlight": "工作区凸显",
      "sess.highlightCount": "已凸显 {n}",
      "sess.highlightClear": "清除凸显",
      "sess.highlightEmpty": "还没有工作区。",
      "sess.agoNow": "刚刚",
      "sess.agoMinutes": "{n} 分钟前",
      "sess.agoHours": "{n} 小时前",
      "sess.agoDays": "{n} 天前",
      "sess.agoMonths": "{n} 个月前",
      "sess.turns": "{n} 轮",
      "sess.tokens": "{n} tokens",
      "sess.notePlaceholder": "点击添加备注",
      "sess.noteAria": "会话备注",
      "sess.noteEdit": "编辑备注",
      "sess.locate": "在侧栏定位",
      "sess.locateHint": "展开左侧工作区并定位到该会话",
      "sess.locateFailed": "没有在侧栏找到这个会话，可能已被归档。",
      "sess.chat": "聊天",
      "sess.chatHint": "给这个会话发一条消息",
      "sess.chatTitle": "发给「{title}」",
      "sess.chatPlaceholder": "输入要发送的内容",
      "sess.chatHelp": "Enter 发送，Shift+Enter 换行",
      "sess.send": "发送",
      "sess.sending": "发送中…",
      "sess.sent": "已发送",
      "sess.sendFailed": "发送失败：{message}",
      "sess.sessionServiceMissing": "会话服务不可用，请重开工作台后再试",
    };

    const en = {
      "entry.label": "My Workspace",
      "panel.title": "My Workspace",
      "panel.back": "Back to chat",
      "tab.sessions": "Sessions",
      "tab.devops": "Devops",
      "common.loading": "Loading…",
      "common.refresh": "Refresh",
      "common.search": "Search id or title",
      "common.copy": "Copy",
      "common.copied": "Copied id",
      "common.none": "-",
      "tab.todo": "To do",
      "tab.review": "To review",
      "tab.created": "Created",
      "tab.all": "All",
      "count.todo": "To do",
      "count.review": "To review",
      "count.created": "Created",
      "count.all": "All",
      "count.empty": "none",
      "count.allHint": "To do, to review and created together",
      "col.id": "ID",
      "col.title": "Title",
      "col.type": "Type",
      "col.status": "Status",
      "col.priority": "Priority",
      "col.points": "Task points",
      "col.end": "Due",
      "col.system": "System",
      "col.reviewKind": "Review kind",
      "col.creator": "Creator",
      "col.devOwner": "Dev owner",
      "col.testOwner": "Test owner",
      "col.owner": "Owner",
      "col.resize": "Drag to resize this column; double-click to reset",
      "col.openModal": "Open details and activity log",
      "empty.todo": "Nothing on your plate.",
      "empty.review": "Nothing waiting for your review.",
      "empty.created": "You have not created anything recently.",
      "empty.search": "No matching item.",
      "empty.all": "Nothing about you right now.",
      "hint.all": "To do, to review and created merged; click an id to open it in DevOps.",
      "hint.todo": "Sorted by due date, nearest first. Click an id to open it in DevOps.",
      "hint.review": "Every kind of item waiting for your review.",
      "hint.created": "Issues, demands, stories and tasks you created, finished ones included.",
      "filter.status": "Status",
      "filter.type": "Type",
      "filter.all": "All",
      "filter.system": "Systems",
      "filter.systemAll": "Select all",
      "filter.systemClear": "Clear",
      "filter.systemCount": "{n}/{m} selected",
      "filter.systemEmpty": "Only checked systems are shown; none is checked.",
      "filter.statusCount": "{n}/{m} selected",
      "filter.statusEmpty": "Only checked statuses are shown; none is checked.",
      "filter.typeCount": "{n}/{m} selected",
      "filter.typeEmpty": "Only checked types are shown; none is checked.",
      "filter.typeNone": "Unclassified",
      "pager.size": "Rows per page",
      "pager.sizeOption": "{n} per page",
      "pager.prev": "Previous",
      "pager.next": "Next",
      "pager.info": "Page {page}/{pages} · {n} items",
      "tile.points": "Task points",
      "tile.pointsHint": "Total across every task, filters do not apply",
      "tile.pointsHintMonth": "Tasks created in {month}",
      "tile.pointsNone": "No task to sum over",
      "sort.pointsDesc": "Sort by task points, most first",
      "sort.pointsAsc": "Sort by task points, fewest first",
      "sort.pointsClear": "Sorting cleared; click to use most first",
      "col.openDetail": "Open in DevOps web",
      "filter.reset": "Reset filters",
      "filter.month": "Created month",
      "filter.monthAny": "All months",
      "filter.monthEmpty": "No month to pick",
      "modal.detail": "Details",
      "modal.log": "Activity log",
      "modal.group.basic": "Basics",
      "modal.group.people": "People",
      "modal.group.plan": "Priority and schedule",
      "modal.group.desc": "Description",
      "modal.openWeb": "Open in DevOps web",
      "modal.close": "Close",
      "modal.loading": "Loading…",
      "modal.error": "Load failed: {message}",
      "modal.empty": "No field to show.",
      "modal.logEmpty": "This item has no activity yet.",
      "modal.more": "Load more",
      "modal.moreLoading": "Loading…",
      "modal.before": "before",
      "modal.after": "after",
      "modal.autoFlow": "automatic status change",
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
      "sess.empty": "No sessions on this machine yet.",
      "sess.emptyFilter": "No session matches the current filter.",
      "sess.untitled": "Untitled session",
      "sess.ungrouped": "Ungrouped",
      "sess.allWorkspaces": "All workspaces",
      "sess.filterWorkspace": "Workspace",
      "sess.search": "Search session titles",
      "sess.running": "Running",
      "sess.waitingApproval": "Waiting for approval",
      "sess.planReview": "Plan awaiting review",
      "sess.waitingAnswer": "Waiting for answer",
      "sess.completed": "Completed",
      "sess.idle": "Idle",
      "sess.pin": "Pin",
      "sess.unpin": "Unpin",
      "sess.pinned": "Pinned",
      "sess.rename": "Rename",
      "sess.fork": "Fork session",
      "sess.copyId": "Copy Session ID",
      "sess.openInApp": "Open in app",
      "sess.archive": "Archive session",
      "sess.unarchive": "Unarchive",
      "sess.renameTitle": "Rename session",
      "sess.renamePlaceholder": "Session title",
      "sess.ok": "OK",
      "sess.cancel": "Cancel",
      "sess.archiveConfirmTitle": "Stop and archive this session?",
      "sess.archiveConfirmBody": "“{title}” is still working; archiving stops it first. You can restore it later from All conversations in the sidebar.",
      "sess.archiveConfirm": "Stop and archive",
      "sess.copied": "Session ID copied",
      "sess.copyFailed": "Copy failed. Try again.",
      "sess.openFailed": "Could not open: {message}",
      "sess.actionFailed": "Action failed: {message}",
      "sess.openSession": "Open session",
      "sess.actions": "More actions",
      "sess.hint": "Pinned sessions come first; the rest sort by last used.",
      "sess.count": "{n} sessions",
      "sess.highlight": "Highlight workspaces",
      "sess.highlightCount": "{n} highlighted",
      "sess.highlightClear": "Clear highlight",
      "sess.highlightEmpty": "No workspace yet.",
      "sess.agoNow": "just now",
      "sess.agoMinutes": "{n} min ago",
      "sess.agoHours": "{n} h ago",
      "sess.agoDays": "{n} d ago",
      "sess.agoMonths": "{n} mo ago",
      "sess.turns": "{n} turns",
      "sess.tokens": "{n} tokens",
      "sess.notePlaceholder": "Click to add a note",
      "sess.noteAria": "Session note",
      "sess.noteEdit": "Edit note",
      "sess.locate": "Locate in sidebar",
      "sess.locateHint": "Expand the left workspace list and point at this session",
      "sess.locateFailed": "This session is not in the sidebar; it may be archived.",
      "sess.chat": "Chat",
      "sess.chatHint": "Send a message to this session",
      "sess.chatTitle": "Message \"{title}\"",
      "sess.chatPlaceholder": "Type the message to send",
      "sess.chatHelp": "Enter sends, Shift+Enter adds a line",
      "sess.send": "Send",
      "sess.sending": "Sending…",
      "sess.sent": "Sent",
      "sess.sendFailed": "Send failed: {message}",
      "sess.sessionServiceMissing": "Session service unavailable — reopen the workbench and retry",
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

      /** One work item's grouped detail; `systemId` resolves its custom fields. */
      itemDetail(id, systemId) {
        const query = "?id=" + encodeURIComponent(id)
          + (typeof systemId === "string" && systemId !== "" ? "&systemId=" + encodeURIComponent(systemId) : "");
        return this.request("/item-detail" + query);
      }

      /** One page of an item's activity log. */
      itemLog(id, page, size) {
        return this.request("/item-log?id=" + encodeURIComponent(id)
          + "&page=" + String(page) + "&size=" + String(size));
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

    /** Last path segment of a workspace folder. */
    function baseName(path) {
      if (typeof path !== "string" || path === "") return "";
      const trimmed = path.replace(/[/\\]+$/, "");
      const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
      return trimmed.slice(index + 1);
    }

    /** Relative "last used" time, e.g. "3 小时前". */
    function agoOf(t, stamp) {
      if (typeof stamp !== "number" || stamp <= 0) return "";
      const minutes = Math.floor((Date.now() - stamp) / 60000);
      if (minutes < 1) return t("sess.agoNow");
      if (minutes < 60) return fill(t("sess.agoMinutes"), { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return fill(t("sess.agoHours"), { n: hours });
      const days = Math.floor(hours / 24);
      if (days < 31) return fill(t("sess.agoDays"), { n: days });
      return fill(t("sess.agoMonths"), { n: Math.floor(days / 30) });
    }

    /** Unwrap a RemoteResult, throwing the platform message on refusal. */
    function unwrap(result) {
      if (result !== null && typeof result === "object" && typeof result.ok === "boolean") {
        if (result.ok === false) {
          const message = result.error !== undefined && result.error !== null && typeof result.error.message === "string"
            ? result.error.message
            : "request refused";
          throw new Error(message);
        }
        return result.value;
      }
      return result;
    }

    /** The failure message of anything thrown by an action. */
    function reasonOf(error) {
      if (error instanceof Error) return error.message;
      return String(error);
    }

    /** Subscribe a component to a snapshot source (store or observable). */
    function useSource(source) {
      const [value, setValue] = react.useState(() => (
        source !== null && source !== undefined && typeof source.getSnapshot === "function" ? source.getSnapshot() : undefined
      ));
      react.useEffect(() => {
        if (source === null || source === undefined || typeof source.getSnapshot !== "function") return undefined;
        let alive = true;
        const read = () => {
          if (alive) setValue(source.getSnapshot());
        };
        read();
        if (typeof source.subscribe !== "function") {
          return () => {
            alive = false;
          };
        }
        const off = source.subscribe(() => read());
        return () => {
          alive = false;
          if (typeof off === "function") off();
        };
      }, [source]);
      return value;
    }

    // #region system filter
    /** localStorage key of the checked-system list; absent means "every system". */
    const SYSTEM_STORE = "dsh-devops-tasks:systems";

    /** The persisted system ids, or `null` when the user never narrowed them. */
    function loadSystemFilter() {
      try {
        const raw = window.localStorage.getItem(SYSTEM_STORE);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : null;
      } catch {
        return null;
      }
    }

    /** Persist the checked-system list; storage failures only lose the setting. */
    function saveSystemFilter(ids) {
      try {
        window.localStorage.setItem(SYSTEM_STORE, JSON.stringify(ids));
      } catch {
        /* keep the session-local choice */
      }
    }

    /**
     * Every system present in the snapshot, as `{id, name}` sorted by name.
     * The platform's listItem has no system condition, so "query only the
     * checked systems" is this client-side filter over the fetched rows.
     */
    function systemOptionsOf(buckets) {
      const seen = new Map();
      for (const tab of Object.values(buckets ?? {})) {
        for (const row of Array.isArray(tab?.items) ? tab.items : []) {
          const id = typeof row.systemId === "string" && row.systemId !== "" ? row.systemId : "";
          if (!seen.has(id)) {
            const name = typeof row.system === "string" && row.system !== "" ? row.system : "(?)";
            seen.set(id, name);
          }
        }
      }
      return Array.from(seen, ([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
    }
    // #endregion

    // #region filter persistence
    /** localStorage key of the remembered filter set (tab, status, type). */
    const FILTER_STORE = "dsh-devops-tasks:filters";

    /** The narrowest a dragged column may become. */
    const MIN_COL_WIDTH = 64;

    /** One persisted checkbox list, or `null` when the visit had none. */
    function listOf(value) {
      if (value === null || value === undefined) return null;
      if (!Array.isArray(value)) return null;
      return value.filter((entry) => typeof entry === "string");
    }

    /** The "YYYY-MM" bucket a platform date string falls into, or "". */
    function monthOf(value) {
      if (typeof value !== "string") return "";
      const hit = /^(\d{4})-(\d{2})/.exec(value);
      return hit === null ? "" : hit[1] + "-" + hit[2];
    }

    /** The month a freshly opened workbench filters on. */
    function currentMonth() {
      const now = new Date();
      return String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0");
    }

    /**
     * The filter set the previous visit left behind. A missing list means
     * "everything is checked", exactly like the live `null` state; a missing
     * month means the current month, which is the default the panel opens on.
     */
    function loadFilters() {
      const empty = { tab: null, status: null, type: null, month: currentMonth() };
      try {
        const raw = window.localStorage.getItem(FILTER_STORE);
        if (raw === null) return empty;
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object") return empty;
        const tab = parsed.tab === "all" || parsed.tab === "todo" || parsed.tab === "review" || parsed.tab === "created"
          ? parsed.tab
          : null;
        // "" is the explicit "every month" choice, so it must not fall back to
        // the current month the way a missing key does.
        const month = typeof parsed.month === "string" && (parsed.month === "" || monthOf(parsed.month + "-01") !== "")
          ? parsed.month
          : currentMonth();
        return { tab, status: listOf(parsed.status), type: listOf(parsed.type), month };
      } catch {
        return empty;
      }
    }

    /** Remember the filter set so the next visit restores it. */
    function saveFilters(next) {
      try {
        window.localStorage.setItem(FILTER_STORE, JSON.stringify({
          tab: next.tab ?? null,
          status: next.status ?? null,
          type: next.type ?? null,
          month: typeof next.month === "string" ? next.month : currentMonth(),
        }));
      } catch {
        /* keep the session-local choice */
      }
    }

    /** localStorage key of the remembered column widths. */
    const COLWIDTH_STORE = "dsh-devops-tasks:colwidth";

    /** The saved width per column key; an empty map means "auto layout". */
    function loadWidths() {
      try {
        const raw = window.localStorage.getItem(COLWIDTH_STORE);
        if (raw === null) return {};
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object") return {};
        const map = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "number" && Number.isFinite(value) && value >= MIN_COL_WIDTH) map[key] = Math.round(value);
        }
        return map;
      } catch {
        return {};
      }
    }

    /** Persist one column-width change; a blocked storage only loses the width. */
    function saveWidths(map) {
      try {
        window.localStorage.setItem(COLWIDTH_STORE, JSON.stringify(map));
      } catch {
        /* keep the session-local widths */
      }
    }
    // #endregion

    // #region notes
    const NOTE_STORE = "dsh-devops-tasks:notes";
    let noteCache = null;

    /** Read the note map once; storage may be unavailable on a locked shell. */
    function notes() {
      if (noteCache !== null) return noteCache;
      noteCache = {};
      try {
        const raw = window.localStorage.getItem(NOTE_STORE);
        const parsed = raw === null ? null : JSON.parse(raw);
        if (parsed !== null && typeof parsed === "object") noteCache = parsed;
      } catch {
        /* keep the empty map */
      }
      return noteCache;
    }

    /** The note a user attached to one session, or the empty string. */
    function noteOf(sessionId) {
      const value = notes()[sessionId];
      return typeof value === "string" ? value : "";
    }

    /** Store (or clear) one session's note. */
    function setNote(sessionId, text) {
      const map = notes();
      const next = text.trim();
      if (next === "") delete map[sessionId];
      else map[sessionId] = next;
      try {
        window.localStorage.setItem(NOTE_STORE, JSON.stringify(map));
      } catch {
        /* a full or blocked storage only loses the note */
      }
    }
    // #endregion

    // #region session figures cache
    /**
     * Turns and tokens are projections: reading them costs one round trip to
     * the session controller, while the numbers themselves only move when the
     * session moves. The reading is therefore kept against the session's
     * `updatedAt` stamp — an unchanged session paints straight from the cache,
     * and only a session that actually ran is asked again.
     */
    const STATS_STORE = "dsh-devops-tasks:stats";
    let statsCache = null;
    let statsSaveTimer = null;

    /** The cached `{ id: { u, turns, tokens } }` map, read from storage once. */
    function statsCacheMap() {
      if (statsCache !== null) return statsCache;
      statsCache = {};
      try {
        const raw = window.localStorage.getItem(STATS_STORE);
        const parsed = raw === null ? null : JSON.parse(raw);
        if (parsed !== null && typeof parsed === "object") {
          for (const id of Object.keys(parsed)) {
            const entry = parsed[id];
            if (entry === null || typeof entry !== "object" || typeof entry.u !== "number") continue;
            statsCache[id] = {
              u: entry.u,
              turns: typeof entry.turns === "number" ? entry.turns : null,
              tokens: typeof entry.tokens === "number" ? entry.tokens : null,
            };
          }
        }
      } catch {
        /* a broken cache only costs one extra reading */
      }
      return statsCache;
    }

    /** Persist the cache a beat later, so a burst of cards writes once. */
    function scheduleStatsSave() {
      if (typeof window === "undefined" || statsSaveTimer !== null) return;
      statsSaveTimer = setTimeout(() => {
        statsSaveTimer = null;
        try {
          window.localStorage.setItem(STATS_STORE, JSON.stringify(statsCacheMap()));
        } catch {
          /* storage pressure only loses the cache */
        }
      }, 500);
    }

    /** The reading stored for this exact session state, or null when stale. */
    function cachedStats(sessionId, updatedAt) {
      const entry = statsCacheMap()[sessionId];
      if (entry === undefined || entry.u !== updatedAt) return null;
      return entry;
    }

    /** Remember one reading; a session that ran again overwrites the old one. */
    function rememberStats(sessionId, updatedAt, turns, tokens) {
      if (sessionId === "" || (turns === null && tokens === null)) return;
      const map = statsCacheMap();
      const entry = map[sessionId];
      if (entry !== undefined && entry.u === updatedAt && entry.turns === turns && entry.tokens === tokens) return;
      map[sessionId] = { u: updatedAt, turns, tokens };
      const ids = Object.keys(map);
      // Sessions come and go; keeping the newest few hundred is plenty.
      if (ids.length > 600) {
        for (const id of ids.slice(0, ids.length - 600)) delete map[id];
      }
      scheduleStatsSave();
    }
    // #endregion

    /** Compact token figure: 12800 → "12.8k". */
    function tokenText(value) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
      if (value < 1000) return String(Math.round(value));
      if (value < 1000000) return (value / 1000).toFixed(value < 10000 ? 1 : 0) + "k";
      return (value / 1000000).toFixed(1) + "M";
    }

    /** Total provider tokens carried by a session's tokenUsage projection. */
    function tokensOf(usage) {
      if (usage === null || usage === undefined || typeof usage !== "object") return null;
      const source = usage.totals !== null && typeof usage.totals === "object" ? usage.totals : usage;
      const fields = ["uncachedInputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];
      let total = 0;
      let seen = false;
      for (const field of fields) {
        const part = source[field];
        if (typeof part === "number" && Number.isFinite(part)) {
          total += part;
          seen = true;
        }
      }
      return seen ? total : null;
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

    /**
     * One session card's status, derived exactly like the DSH sidebar:
     * a visible pending interaction wins over running, running over the
     * unread completion marker, and everything else is idle.
     */
    function statusOf(t, status) {
      const kind = status !== null && status !== undefined && status.pendingInteraction !== null && status.pendingInteraction !== undefined
        ? status.pendingInteraction.kind
        : undefined;
      if (kind === "approval") return { state: "warning", label: t("sess.waitingApproval") };
      if (kind === "plan-review") return { state: "warning", label: t("sess.planReview") };
      if (kind === "question") return { state: "warning", label: t("sess.waitingAnswer") };
      if (status !== null && status !== undefined && status.running === true) return { state: "ongoing", label: t("sess.running") };
      if (status !== null && status !== undefined && status.completionUnread === true) return { state: "done", label: t("sess.completed") };
      return { state: "idle", label: t("sess.idle") };
    }

    /** Flatten the session list plus its workspace and status sources into cards. */
    function sessionRows(t, list, statuses, workspaces) {
      if (list === null || list === undefined) return [];
      const workspaceItems = workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.items) ? workspaces.items : [];
      const pinnedIds = workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.pinnedSessionIds) ? workspaces.pinnedSessionIds : [];
      const archivedIds = workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.archivedSessionIds) ? workspaces.archivedSessionIds : [];
      const pinned = new Map(pinnedIds.map((id, index) => [id, index]));
      const archived = new Set(archivedIds);
      const workspaceOf = new Map();
      for (const workspace of workspaceItems) {
        for (const id of Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []) workspaceOf.set(id, workspace);
      }
      const ids = Array.isArray(list.ids) ? list.ids : [];
      const byId = list.byId !== null && list.byId !== undefined ? list.byId : {};
      const projections = list.projectionsBySession !== null && list.projectionsBySession !== undefined ? list.projectionsBySession : {};
      const rows = [];
      for (const id of ids) {
        const summary = byId[id];
        if (summary === null || summary === undefined) continue;
        // Archived sessions live behind the sidebar's own filter, and subagent
        // children are not sessions the user opens from here.
        if (archived.has(id)) continue;
        if (summary.origin === "subagent") continue;
        const workspace = workspaceOf.get(id);
        const cwd = typeof summary.cwd === "string" && summary.cwd !== "" ? summary.cwd : (workspace !== undefined ? workspace.path : "");
        const status = statuses !== null && statuses !== undefined && typeof statuses.get === "function" ? statuses.get(id) : undefined;
        const rawTitle = summary.blank === true ? "" : String(summary.title === undefined || summary.title === null ? "" : summary.title).trim();
        const pinnedIndex = pinned.has(id) ? pinned.get(id) : Number.MAX_SAFE_INTEGER;
        // Turns and tokens live in projections; the summary payload excludes
        // them, so a card shows them once the store has been asked for them.
        const projection = projections[id];
        const values = projection !== null && projection !== undefined && projection.values !== null && projection.values !== undefined
          ? projection.values
          : (summary.projectionValues !== null && summary.projectionValues !== undefined ? summary.projectionValues : {});
        const stats = values.sessionStats;
        const updatedAt = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
        const liveTurns = stats !== null && stats !== undefined && typeof stats.turns === "number" ? stats.turns : null;
        const liveTokens = tokensOf(values.tokenUsage);
        // A session that has not moved since the last reading keeps its numbers
        // without asking the controller again.
        const cached = liveTurns === null && liveTokens === null ? cachedStats(id, updatedAt) : null;
        if (liveTurns !== null || liveTokens !== null) rememberStats(id, updatedAt, liveTurns, liveTokens);
        rows.push({
          id,
          title: rawTitle,
          cwd,
          workspace: workspace !== undefined && typeof workspace.title === "string" && workspace.title !== "" ? workspace.title : baseName(cwd),
          workspaceId: workspace !== undefined ? workspace.workspaceId : "",
          status: statusOf(t, status),
          pinned: pinned.has(id),
          rank: pinnedIndex,
          updatedAt,
          current: summary.retainedBy !== undefined && summary.retainedBy !== null && (summary.retainedBy.mainView ?? 0) > 0,
          running: (status !== undefined && status.running === true) || summary.running === true,
          turns: liveTurns !== null ? liveTurns : (cached === null ? null : cached.turns),
          tokens: liveTokens !== null ? liveTokens : (cached === null ? null : cached.tokens),
          note: noteOf(id),
        });
      }
      // Pinned cards keep the platform's own order (most recent pin first);
      // everything else follows the last-used time, across workspaces.
      rows.sort((left, right) => (left.rank - right.rank) || (right.updatedAt - left.updatedAt));
      return rows;
    }
    // #endregion

    // #region sidebar locate
    /** Escape one value for use inside an attribute selector. */
    function selectorValue(value) {
      if (typeof window !== "undefined" && window.CSS !== undefined && typeof window.CSS.escape === "function") {
        return window.CSS.escape(String(value));
      }
      return String(value).replace(/"/g, '\\"');
    }

    const wait = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    /**
     * Reveal a session in the sidebar's workspace tree.
     *
     * The sidebar keeps its reveal state private to its own search flow, so the
     * only supported path is the DOM it renders: `data-row-key` identifies the
     * session rows, the workspace group headers and the "more sessions" buttons,
     * and clicking those is exactly what a user would do.
     */
    async function revealInSidebar(layout, row) {
      if (typeof document === "undefined") return false;
      // While a panel is open the sidebar can be collapsed to its rail.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const area = document.querySelector("[data-sidebar-list-area]");
        if (area !== null && area.getBoundingClientRect().width > 40) break;
        if (layout !== null && layout !== undefined && typeof layout.toggleSidebar === "function") layout.toggleSidebar();
        await wait(140);
      }
      const rowSelector = '[data-row-key="session:' + selectorValue(row.id) + '"]';
      let target = document.querySelector(rowSelector);
      // The tree is virtualised, so a row only exists in the DOM once its group
      // is expanded *and* scrolled into view: expand, then poll for the row.
      for (let attempt = 0; attempt < 30 && target === null; attempt += 1) {
        const groups = Array.from(document.querySelectorAll('[data-row-key^="workspace:"]'));
        const group = row.workspace === ""
          ? groups.find((node) => node.getAttribute("data-row-key") === "workspace:")
          : groups.find((node) => (node.textContent || "").includes(row.workspace));
        if (group !== undefined && group !== null && group.getAttribute("aria-expanded") !== "true") {
          group.click();
          await wait(120);
        }
        const key = group === undefined || group === null || group === ""
          ? ""
          : String(group.getAttribute("data-row-key") || "").slice("workspace:".length);
        const overflow = document.querySelector('[data-row-key="overflow:' + selectorValue(key) + '"]');
        if (overflow !== null && overflow.getAttribute("aria-expanded") !== "true") {
          overflow.click();
          await wait(160);
        }
        target = document.querySelector(rowSelector);
        if (target === null && attempt > 2) {
          const area = document.querySelector("[data-sidebar-list-area]");
          if (area !== null) area.scrollTop = area.scrollTop + 160;
        }
        if (target === null) await wait(110);
      }
      if (target === null) return false;
      target.scrollIntoView({ block: "center" });
      target.setAttribute("data-dt-locate", "");
      setTimeout(() => {
        if (target !== null) target.removeAttribute("data-dt-locate");
      }, 1800);
      return true;
    }
    // #endregion

    // #region glyphs
    /** Sidebar glyph for the workbench entry: a small checklist. */
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

    /** Small per-state glyph used on session cards. */
    function StatusIcon(props) {
      const common = {
        viewBox: "0 0 12 12",
        width: 12,
        height: 12,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.3,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      };
      if (props.state === "ongoing") {
        return h("svg", common,
          h("circle", { cx: "6", cy: "6", r: "4.6", opacity: "0.35" }),
          h("path", { d: "M6 2.6a3.4 3.4 0 0 1 3.4 3.4", strokeWidth: "1.6" }));
      }
      if (props.state === "warning") {
        return h("svg", common,
          h("circle", { cx: "6", cy: "6", r: "4.6" }),
          h("path", { d: "M6 3.6v3.1" }),
          h("circle", { cx: "6", cy: "8.5", r: "0.45", fill: "currentColor", stroke: "none" }));
      }
      if (props.state === "done") {
        return h("svg", common,
          h("circle", { cx: "6", cy: "6", r: "4.6" }),
          h("path", { d: "M3.9 6.1 5.3 7.5 8.2 4.6" }));
      }
      return h("svg", common,
        h("circle", { cx: "6", cy: "6", r: "4.6" }),
        h("path", { d: "M3.9 6h4.2" }));
    }

    /** The shell's own status dot (keeps the running animation), with a fallback. */
    function StatusDot(props) {
      const dot = primitives !== null && primitives !== undefined ? primitives.StateDot : undefined;
      if (typeof dot === "function") return h(dot, { state: props.state });
      return h(StatusIcon, { state: props.state });
    }

    /** Crosshair glyph: reveal this session in the sidebar's workspace tree. */
    function LocateIcon() {
      return h("svg", {
        viewBox: "0 0 16 16",
        width: 14,
        height: 14,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
        h("circle", { cx: "8", cy: "8", r: "4.2" }),
        h("circle", { cx: "8", cy: "8", r: "1.1", fill: "currentColor", stroke: "none" }),
        h("path", { d: "M8 1.6v2.2M8 12.2v2.2M1.6 8h2.2M12.2 8h2.2" }));
    }

    /** Pin glyph: a tilted pushpin, filled once the session is pinned. */
    function PinIcon(props) {
      return h("svg", {
        viewBox: "0 0 16 16",
        width: 14,
        height: 14,
        fill: props.filled ? "currentColor" : "none",
        stroke: "currentColor",
        strokeWidth: 1.2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
        h("path", { d: "M9.7 1.9l4.4 4.4-2.1.4-2.6 2.6-.5 2.4-4.6-4.6 2.4-.5 2.6-2.6z" }),
        h("path", { d: "M6.9 9.1L2.4 13.6" }));
    }

    /** Chat glyph for the card's "send a message" action. */
    function ChatIcon() {
      return h("svg", {
        viewBox: "0 0 16 16",
        width: 14,
        height: 14,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
        h("path", { d: "M2.2 3.6h11.6v7.2H7.4L4.2 13.4v-2.6H2.2z" }),
        h("path", { d: "M5 6.4h6M5 8.6h4" }));
    }

    /** Kebab glyph for the card menu. */
    function KebabIcon() {
      return h("svg", {
        viewBox: "0 0 16 16",
        width: 14,
        height: 14,
        fill: "currentColor",
        "aria-hidden": "true",
      },
        h("circle", { cx: "8", cy: "3.4", r: "1.15" }),
        h("circle", { cx: "8", cy: "8", r: "1.15" }),
        h("circle", { cx: "8", cy: "12.6", r: "1.15" }));
    }

    /** A calendar-ish glyph for a workspace name. */
    function FolderIcon() {
      return h("svg", {
        viewBox: "0 0 16 16",
        width: 12,
        height: 12,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
        h("path", { d: "M1.9 4.4h4l1.3 1.5h6.9v6.2a1 1 0 0 1-1 1H2.9a1 1 0 0 1-1-1z" }));
    }
    // #endregion

    // #region devops tab
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

    /** A read-only tile: the task-point total over the rows now on screen. */
    function PointsTile(props) {
      const t = props.t;
      return h("div", {
        className: "dt-tile",
        "data-static": "",
        "data-tone": props.tone,
      },
        h("span", { className: "dt-tileTop" },
          h("span", { className: "dt-tileLabel" }, t("tile.points")),
          h("span", { className: "dt-tileValue" }, props.summary)),
        h("span", { className: "dt-tileHint" }, props.hint));
    }

    /** Distinct values of one row field, sorted for a filter menu. */
    function distinctOf(rows, pick) {
      const seen = new Set();
      for (const row of rows) {
        const value = pick(row);
        if (typeof value === "string" && value !== "") seen.add(value);
      }
      return Array.from(seen).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
    }

    /** The DevOps tab: counts, task-point tile, filters, three buckets, table. */
    function DevopsView(props) {
      const t = props.t;
      const api = props.api;
      const [tab, setTab] = react.useState(() => loadFilters().tab ?? "todo");
      const [query, setQuery] = react.useState("");
      // The checkbox filters are restored from the previous visit: `null`
      // still means "everything", an array is the exact checked set.
      const [statusFilter, setStatusFilter] = react.useState(() => loadFilters().status);
      const [typeFilter, setTypeFilter] = react.useState(() => loadFilters().type);
      // "YYYY-MM" narrows the table and the task-point tile to the month the
      // work was created, "" means every month.
      const [monthFilter, setMonthFilter] = react.useState(() => loadFilters().month);
      const [systemFilter, setSystemFilter] = react.useState(() => loadSystemFilter());
      const [pickerOpen, setPickerOpen] = react.useState(false);
      const [statusOpen, setStatusOpen] = react.useState(false);
      const [typeOpen, setTypeOpen] = react.useState(false);
      // "desc" → "asc" → null: the points header cycles through both
      // directions and back to the default order.
      const [pointsSort, setPointsSort] = react.useState(null);
      const [pageSize, setPageSize] = react.useState(20);
      const [page, setPage] = react.useState(1);
      // Column widths the user dragged; a key that is absent keeps the
      // browser's own layout.
      const [widths, setWidths] = react.useState(() => loadWidths());
      // The row whose detail dialog is open, or null.
      const [modalRow, setModalRow] = react.useState(null);
      const picker = react.useRef(null);
      const statusPicker = react.useRef(null);
      const typePicker = react.useRef(null);
      const snap = useSnapshot(api);

      // Close the system, status and type menus on any click elsewhere.
      react.useEffect(() => {
        if (!pickerOpen && !statusOpen && !typeOpen) return undefined;
        const onDown = (event) => {
          if (pickerOpen && picker.current !== null && !picker.current.contains(event.target)) setPickerOpen(false);
          if (statusOpen && statusPicker.current !== null && !statusPicker.current.contains(event.target)) setStatusOpen(false);
          if (typeOpen && typePicker.current !== null && !typePicker.current.contains(event.target)) setTypeOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
      }, [pickerOpen, statusOpen, typeOpen]);

      const data = snap.data;
      const tabs = [
        { id: "all", label: t("tab.all") },
        { id: "todo", label: t("tab.todo") },
        { id: "review", label: t("tab.review") },
        { id: "created", label: t("tab.created") },
      ];
      const counts = data !== null && data.counts !== null && data.counts !== undefined ? data.counts : {};
      const buckets = data !== null && data.tabs !== null && data.tabs !== undefined ? data.tabs : {};
      const bucketOf = (id) => (buckets[id] !== undefined && buckets[id] !== null ? buckets[id] : { items: [], total: 0 });
      // The "all" tab merges the three buckets, keeping the first occurrence of
      // every work item and every distinct reminder. The merged rows are always
      // built: the task-point tile sums over them whatever tab is showing.
      const merged = [];
      {
        const seenKeys = new Set();
        for (const id of ["todo", "review", "created"]) {
          for (const row of bucketOf(id).items) {
            const key = row.id !== "" ? "id:" + row.id : "text:" + row.title + "|" + row.system;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            merged.push(row);
          }
        }
      }
      const bucket = tab === "all"
        ? { items: merged, total: merged.length, truncated: false }
        : bucketOf(tab);
      const all = Array.isArray(bucket.items) ? bucket.items : [];

      const systems = systemOptionsOf(buckets);
      const checked = systemFilter === null ? null : new Set(systemFilter);
      const systemsActive = checked !== null && checked.size < systems.length;
      const needle = query.trim().toLowerCase();
      const statusOptions = distinctOf(all, (row) => row.status);
      const statusChecked = statusFilter === null ? null : new Set(statusFilter);
      const statusActive = statusChecked !== null && statusChecked.size < statusOptions.length;
      // Items without a type ("-") are offered as their own checkbox so a
      // narrowed type list can bring them back.
      const typedValues = distinctOf(all, (row) => row.type);
      const blankType = all.some((row) => typeof row.type !== "string" || row.type === "");
      const typeOptions = blankType ? typedValues.concat("") : typedValues;
      const typeChecked = typeFilter === null ? null : new Set(typeFilter);
      const typeActive = typeChecked !== null && typeChecked.size < typeOptions.length;

      const rows = all.filter((row) => {
        if (checked !== null && !checked.has(typeof row.systemId === "string" ? row.systemId : "")) return false;
        if (statusChecked !== null && !statusChecked.has(row.status)) return false;
        if (typeChecked !== null && !typeChecked.has(typeof row.type === "string" ? row.type : "")) return false;
        if (monthFilter !== "") {
          const month = monthOf(row.created);
          // A row the platform does not date is never hidden by the month
          // filter, so an incomplete payload cannot blank the whole table.
          if (month !== "" && month !== monthFilter) return false;
        }
        if (needle === "") return true;
        return String(row.title).toLowerCase().includes(needle) || String(row.id).toLowerCase().includes(needle);
      });

      // Only the points column sorts; rows without a value always go last so
      // the ordering stays predictable in both directions.
      const pointOf = (row) => (typeof row.points === "number" && Number.isFinite(row.points) ? row.points : null);
      const sortedRows = pointsSort === null
        ? rows
        : rows.slice().sort((left, right) => {
          const a = pointOf(left);
          const b = pointOf(right);
          if (a === null && b === null) return 0;
          if (a === null) return 1;
          if (b === null) return -1;
          return pointsSort === "desc" ? b - a : a - b;
        });

      // Any change to the filters or the sort starts again from the first page.
      react.useEffect(() => {
        setPage(1);
      }, [tab, needle, statusFilter, typeFilter, systemFilter, monthFilter, pageSize, pointsSort]);

      // The filter set survives a reload, so the workbench opens exactly where
      // the user left it.
      react.useEffect(() => {
        saveFilters({ tab, status: statusFilter, type: typeFilter, month: monthFilter });
      }, [tab, statusFilter, typeFilter, monthFilter]);

      /** Back to the untouched view: first tab, current month, nothing narrowed. */
      const resetFilters = () => {
        setTab("todo");
        setStatusFilter(null);
        setTypeFilter(null);
        setMonthFilter(currentMonth());
        setSystemFilter(null);
        saveSystemFilter(null);
        setQuery("");
      };

      /** Start dragging one column's right edge. */
      const startResize = (key, event) => {
        event.preventDefault();
        event.stopPropagation();
        const cell = event.currentTarget.parentElement;
        const startX = event.clientX;
        const startWidth = cell !== null && cell !== undefined ? cell.getBoundingClientRect().width : (widths[key] ?? 140);
        const move = (moveEvent) => {
          const next = Math.max(MIN_COL_WIDTH, Math.round(startWidth + moveEvent.clientX - startX));
          setWidths((prev) => ({ ...prev, [key]: next }));
        };
        const up = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          document.body.style.userSelect = "";
          setWidths((prev) => {
            saveWidths(prev);
            return prev;
          });
        };
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      };

      /** Drop one column's remembered width (double-click on its edge). */
      const resetWidth = (key) => {
        setWidths((prev) => {
          const next = { ...prev };
          delete next[key];
          saveWidths(next);
          return next;
        });
      };

      const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
      const safePage = Math.min(page, pageCount);
      const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

      // Every month the loaded work items were created in, newest first; the
      // selected and the current one stay selectable even when no row falls in
      // them, otherwise the picker could not show what is on screen.
      const monthOptions = (() => {
        const seen = new Set();
        for (const row of merged) {
          const month = monthOf(row.created);
          if (month !== "") seen.add(month);
        }
        seen.add(currentMonth());
        if (monthFilter !== "") seen.add(monthFilter);
        return Array.from(seen).sort((left, right) => (left < right ? 1 : left > right ? -1 : 0));
      })();

      // The point total is scoped by the creation month only: it sums the
      // merged three buckets of that month, so no other filter changes it.
      const monthRows = monthFilter === ""
        ? merged
        : merged.filter((row) => monthOf(row.created) === monthFilter);
      const pointSum = monthRows.reduce((total, row) => {
        const value = pointOf(row);
        return value === null ? total : total + value;
      }, 0);
      const pointRows = monthRows.filter((row) => pointOf(row) !== null).length;
      const pointHint = monthRows.length === 0
        ? t("tile.pointsNone")
        : fill(t("tile.pointsHintMonth"), { month: monthFilter === "" ? t("filter.monthAny") : monthFilter });
      const pointSummary = pointRows === 0 ? "-" : String(Math.round(pointSum * 100) / 100);

      const toggleStatus = (value) => {
        const base = statusChecked === null ? new Set(statusOptions) : new Set(statusChecked);
        if (base.has(value)) base.delete(value);
        else base.add(value);
        setStatusFilter(statusOptions.filter((entry) => base.has(entry)));
      };
      const setAllStatus = (on) => setStatusFilter(on ? statusOptions : []);

      const toggleType = (value) => {
        const base = typeChecked === null ? new Set(typeOptions) : new Set(typeChecked);
        if (base.has(value)) base.delete(value);
        else base.add(value);
        setTypeFilter(typeOptions.filter((entry) => base.has(entry)));
      };
      const setAllType = (on) => setTypeFilter(on ? typeOptions : []);

      const toggleSystem = (id) => {
        const base = checked === null ? new Set(systems.map((entry) => entry.id)) : new Set(checked);
        if (base.has(id)) base.delete(id);
        else base.add(id);
        const next = systems.map((entry) => entry.id).filter((entry) => base.has(entry));
        setSystemFilter(next);
        saveSystemFilter(next);
      };
      const setAllSystems = (on) => {
        const next = on ? systems.map((entry) => entry.id) : [];
        setSystemFilter(next);
        saveSystemFilter(next);
      };

      // The title opens the detail dialog instead of navigating away; the id
      // still links out to the platform. Reminder rows carry no id, so they
      // stay plain text and open nothing.
      const titleCell = (row) => {
        if (row.id === "") return h("span", null, row.title);
        return h("button", {
          type: "button",
          className: "dt-titleBtn",
          title: t("col.openModal"),
          onClick: () => setModalRow(row),
        }, row.title);
      };

      // One header cell: the label (a sort toggle for the points column) plus
      // the drag handle on its right edge.
      const headOf = (column) => [
        column.key === "points"
          ? h("button", {
            key: "label",
            type: "button",
            className: "dt-sortBtn",
            "data-active": pointsSort === null ? undefined : "",
            "data-dir": pointsSort === null ? "none" : pointsSort,
            "aria-label": pointsSort === null
              ? t("sort.pointsDesc")
              : pointsSort === "desc"
                ? t("sort.pointsAsc")
                : t("sort.pointsClear"),
            title: pointsSort === null
              ? t("sort.pointsDesc")
              : pointsSort === "desc"
                ? t("sort.pointsAsc")
                : t("sort.pointsClear"),
            onClick: () => setPointsSort(pointsSort === null ? "desc" : pointsSort === "desc" ? "asc" : null),
          },
            h("span", null, column.label),
            h("span", { className: "dt-sortMark" }, pointsSort === "desc" ? "▼" : pointsSort === "asc" ? "▲" : "↕"))
          : h("span", { key: "label" }, column.label),
        h("span", {
          key: "grip",
          className: "dt-colResize",
          title: t("col.resize"),
          onMouseDown: (event) => startResize(column.key, event),
          onDoubleClick: () => resetWidth(column.key),
        }),
      ];

      const columns = tab === "review"
        ? [
          { key: "id", label: t("col.id"), render: (row) => detailCell(row, t) },
          { key: "title", label: t("col.title"), render: titleCell },
          { key: "sceneLabel", label: t("col.reviewKind"), render: (row) => chip(row.sceneLabel) },
          { key: "status", label: t("col.status"), render: (row) => chip(row.status, statusTone(row)) },
          { key: "points", label: t("col.points"), render: (row) => pointsCell(row) },
          { key: "creator", label: t("col.creator"), render: (row) => personCell(row.creator) },
          { key: "devOwner", label: t("col.devOwner"), render: (row) => personCell(row.devOwner) },
          { key: "testOwner", label: t("col.testOwner"), render: (row) => personCell(row.testOwner) },
          { key: "owner", label: t("col.owner"), render: (row) => personCell(row.owner) },
          { key: "end", label: t("col.end"), render: (row) => endCell(row) },
          { key: "system", label: t("col.system"), render: (row) => systemCell(row) },
        ]
        : [
          { key: "id", label: t("col.id"), render: (row) => detailCell(row, t) },
          { key: "title", label: t("col.title"), render: titleCell },
          { key: "type", label: t("col.type"), render: (row) => row.type === "" ? h("span", { className: "dt-muted" }, "-") : row.type },
          { key: "status", label: t("col.status"), render: (row) => chip(row.status, statusTone(row)) },
          { key: "priority", label: t("col.priority"), render: (row) => chip(row.priority, priorityTone(row.priority)) },
          { key: "points", label: t("col.points"), render: (row) => pointsCell(row) },
          { key: "creator", label: t("col.creator"), render: (row) => personCell(row.creator) },
          { key: "devOwner", label: t("col.devOwner"), render: (row) => personCell(row.devOwner) },
          { key: "testOwner", label: t("col.testOwner"), render: (row) => personCell(row.testOwner) },
          { key: "owner", label: t("col.owner"), render: (row) => personCell(row.owner) },
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

      const systemPicker = h("div", { className: "dt-picker", ref: picker },
        h("button", {
          type: "button",
          className: "dt-btn",
          "data-active": systemsActive ? "" : undefined,
          title: t("filter.system"),
          onClick: () => setPickerOpen((open) => !open),
        }, t("filter.system") + "：" + fill(t("filter.systemCount"), { n: checked === null ? systems.length : checked.size, m: systems.length })),
        pickerOpen
          ? h("div", { className: "dt-pickerMenu", role: "group", "aria-label": t("filter.system") },
            h("div", { className: "dt-pickerHead" },
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllSystems(true) }, t("filter.systemAll")),
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllSystems(false) }, t("filter.systemClear"))),
            systems.length === 0
              ? h("span", { className: "dt-muted", style: { fontSize: "12px" } }, t("filter.systemEmpty"))
              : systems.map((entry) => h("label", { key: entry.id, className: "dt-pickerItem" },
                h("input", {
                  type: "checkbox",
                  checked: checked === null || checked.has(entry.id),
                  onChange: () => toggleSystem(entry.id),
                }),
                h("span", null, entry.name))))
          : null);

      const statusPickerNode = h("div", { className: "dt-picker", ref: statusPicker },
        h("button", {
          type: "button",
          className: "dt-btn",
          "data-active": statusActive ? "" : undefined,
          title: t("filter.status"),
          onClick: () => setStatusOpen((open) => !open),
        }, t("filter.status") + "：" + fill(t("filter.statusCount"), { n: statusChecked === null ? statusOptions.length : statusChecked.size, m: statusOptions.length })),
        statusOpen
          ? h("div", { className: "dt-pickerMenu", role: "group", "aria-label": t("filter.status") },
            h("div", { className: "dt-pickerHead" },
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllStatus(true) }, t("filter.systemAll")),
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllStatus(false) }, t("filter.systemClear"))),
            statusOptions.length === 0
              ? h("span", { className: "dt-muted", style: { fontSize: "12px" } }, t("filter.statusEmpty"))
              : statusOptions.map((option) => h("label", { key: option, className: "dt-pickerItem" },
                h("input", {
                  type: "checkbox",
                  checked: statusChecked === null || statusChecked.has(option),
                  onChange: () => toggleStatus(option),
                }),
                h("span", null, option))))
          : null);

      // Types are checked exactly like statuses: null means "everything",
      // an empty array means the user explicitly cleared the list.
      const typePickerNode = h("div", { className: "dt-picker", ref: typePicker },
        h("button", {
          type: "button",
          className: "dt-btn",
          "data-active": typeActive ? "" : undefined,
          title: t("filter.type"),
          onClick: () => setTypeOpen((open) => !open),
        }, t("filter.type") + "：" + fill(t("filter.typeCount"), { n: typeChecked === null ? typeOptions.length : typeChecked.size, m: typeOptions.length })),
        typeOpen
          ? h("div", { className: "dt-pickerMenu", role: "group", "aria-label": t("filter.type") },
            h("div", { className: "dt-pickerHead" },
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllType(true) }, t("filter.systemAll")),
              h("button", { type: "button", className: "dt-btn", onClick: () => setAllType(false) }, t("filter.systemClear"))),
            typeOptions.length === 0
              ? h("span", { className: "dt-muted", style: { fontSize: "12px" } }, t("filter.typeEmpty"))
              : typeOptions.map((option) => h("label", { key: option === "" ? "__blank" : option, className: "dt-pickerItem" },
                h("input", {
                  type: "checkbox",
                  checked: typeChecked === null || typeChecked.has(option),
                  onChange: () => toggleType(option),
                }),
                h("span", null, option === "" ? t("filter.typeNone") : option))))
          : null);

      // The creation month is the only filter the task-point tile follows: the
      // tile sums the work created in the selected month, whatever the table is
      // narrowed to.
      const monthPickerNode = h("select", {
        className: "dt-select",
        value: monthFilter,
        "aria-label": t("filter.month"),
        title: t("filter.month"),
        onChange: (event) => setMonthFilter(event.target.value),
      }, [""].concat(monthOptions).map((month) => h("option", { key: month === "" ? "__any" : month, value: month },
        month === "" ? t("filter.monthAny") : month)));

      return h(react.Fragment, null,
        h("div", { className: "dt-tiles" },
          tabs.map((entry) => {
            const countsFor = counts[entry.id] !== undefined && counts[entry.id] !== null ? counts[entry.id] : null;
            // The created bucket merges several platform scenes, so its own row
            // count can exceed the single-scene counter from getCountAutoZone.
            const counted = countsFor !== null && typeof countsFor.total === "number" ? countsFor.total : 0;
            const listed = entry.id === "all" ? merged.length : bucketOf(entry.id).total;
            const total = Math.max(counted, typeof listed === "number" ? listed : 0);
            return h(CountTile, {
              key: entry.id,
              t,
              label: t("count." + entry.id),
              total,
              hint: entry.id === "all" ? t("count.allHint") : breakdown(t, countsFor),
              active: tab === entry.id,
              onSelect: () => setTab(entry.id),
            });
          }),
          h(PointsTile, { key: "points", t, summary: pointSummary, hint: pointHint })),

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
          h("span", { className: "dt-muted", style: { fontSize: "11.5px" } }, t("hint." + tab)),
          stateChip,
          snap.loading ? h("span", { className: "dt-spinner", role: "status", "aria-label": t("common.loading") }) : null,
          h("button", { type: "button", className: "dt-btn", disabled: snap.loading, onClick: () => snap.refresh(true) }, t("common.refresh"))),

        h("div", { className: "dt-toolbar" },
          statusPickerNode,
          typePickerNode,
          monthPickerNode,
          systemPicker,
          h("span", { style: { flex: "1 1 auto" } }),
          h("button", {
            type: "button",
            className: "dt-btn",
            onClick: resetFilters,
          }, t("filter.reset"))),

        h("div", { className: "dt-body" },
          snap.loading && data === null ? null : h(react.Fragment, null,
            rows.length === 0
              ? h("div", { className: "dt-empty" },
                needle === "" && statusFilter === null && typeFilter === null && monthFilter === "" && !systemsActive
                  ? t("empty." + tab)
                  : t("empty.search"))
              : h("div", { className: "dt-tableWrap" },
                h("table", { className: "dt-table" },
                  h("colgroup", null, columns.map((column) => h("col", {
                    key: column.key,
                    style: widths[column.key] === undefined ? undefined : { width: widths[column.key] + "px" },
                  }))),
                  h("thead", null, h("tr", null, columns.map((column) => h("th", {
                    key: column.key,
                    style: widths[column.key] === undefined ? undefined : { width: widths[column.key] + "px" },
                  }, headOf(column))))),
                  h("tbody", null, pageRows.map((row) => h("tr", { key: row.id === "" ? row.title + row.scene : row.id },
                    columns.map((column) => h("td", { key: column.key }, column.render(row)))))))),
            h("div", { className: "dt-footer", style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
              h("span", null,
                bucket.truncated === true
                  ? fill(t("state.truncated"), { total: bucket.total, shown: rows.length })
                  : fill(t("state.total"), { total: bucket.total })),
              h("span", { style: { flex: "1 1 auto" } }),
              h("div", { className: "dt-pager" },
                h("select", {
                  className: "dt-select",
                  value: String(pageSize),
                  "aria-label": t("pager.size"),
                  title: t("pager.size"),
                  onChange: (event) => setPageSize(Number(event.target.value)),
                }, [20, 50, 100].map((size) => h("option", { key: size, value: String(size) }, fill(t("pager.sizeOption"), { n: size })))),
                h("button", { type: "button", className: "dt-btn", disabled: safePage <= 1, onClick: () => setPage(safePage - 1) }, t("pager.prev")),
                h("span", null, fill(t("pager.info"), { page: safePage, pages: pageCount, n: rows.length })),
                h("button", { type: "button", className: "dt-btn", disabled: safePage >= pageCount, onClick: () => setPage(safePage + 1) }, t("pager.next"))))),
        modalRow === null ? null : h(ItemModal, {
          key: "modal",
          t,
          api,
          row: modalRow,
          onClose: () => setModalRow(null),
        })));
    }

    /** One activity-log line: who, when, what changed, and its two values. */
    function LogRow(props) {
      const t = props.t;
      const entry = props.entry;
      const user = entry.user === "" ? "?" : entry.user;
      const initial = user.slice(0, 1);
      const sameValue = entry.before === entry.after;
      return h("div", { className: "dt-logRow" },
        // The "automatic status change" tag leads the row so it reads before the
        // operator, the way the platform's own log panel shows it.
        entry.flow === true && sameValue ? h("span", { className: "dt-logTag" }, t("modal.autoFlow")) : null,
        h("span", { className: "dt-logAvatar", title: user }, initial),
        h("div", { className: "dt-logBody" },
          h("div", { className: "dt-logHead" },
            h("span", { className: "dt-logUser" }, user),
            h("span", { className: "dt-logTime" }, entry.time)),
          h("div", { className: "dt-logItem" }, entry.item),
          entry.before === "" && entry.after === ""
            ? null
            : h("div", { className: "dt-logValues" },
              h("span", { className: "dt-logBefore", title: entry.before }, entry.before === "" ? "-" : entry.before),
              h("span", { className: "dt-logArrow" }, "→"),
              h("span", { className: "dt-logAfter", title: entry.after }, entry.after === "" ? "-" : entry.after))));
    }

    /** The detail dialog: grouped fields first, the activity log second. */
    function ItemModal(props) {
      const t = props.t;
      const api = props.api;
      const row = props.row;
      const [tabKey, setTabKey] = react.useState("detail");
      const [detail, setDetail] = react.useState({ loading: true, data: null, error: "" });
      const [log, setLog] = react.useState({ loading: true, rows: [], error: "", page: 0, more: false, loadingMore: false });

      react.useEffect(() => {
        let alive = true;
        setDetail({ loading: true, data: null, error: "" });
        api.itemDetail(row.id, row.systemId).then((data) => {
          if (alive) setDetail({ loading: false, data, error: "" });
        }).catch((error) => {
          if (alive) setDetail({ loading: false, data: null, error: reasonOf(error) });
        });
        setLog({ loading: true, rows: [], error: "", page: 0, more: false, loadingMore: false });
        api.itemLog(row.id, 1, 50).then((data) => {
          if (alive) setLog({ loading: false, rows: data.rows, error: "", page: 1, more: data.rows.length >= 50, loadingMore: false });
        }).catch((error) => {
          if (alive) setLog({ loading: false, rows: [], error: reasonOf(error), page: 0, more: false, loadingMore: false });
        });
        return () => {
          alive = false;
        };
      }, [api, row.id, row.systemId]);

      // Escape closes the dialog, like every other overlay in the panel.
      const onClose = props.onClose;
      react.useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [onClose]);

      const loadMore = () => {
        if (log.loadingMore || log.page === 0) return;
        const next = log.page + 1;
        setLog((prev) => ({ ...prev, loadingMore: true }));
        api.itemLog(row.id, next, 50).then((data) => {
          setLog((prev) => ({
            ...prev,
            loadingMore: false,
            page: next,
            more: data.rows.length >= 50,
            rows: prev.rows.concat(data.rows),
          }));
        }).catch((error) => {
          setLog((prev) => ({ ...prev, loadingMore: false, error: reasonOf(error) }));
        });
      };

      const detailBody = detail.loading
        ? h("div", { className: "dt-empty" }, t("modal.loading"))
        : detail.error !== ""
          ? notice("error", fill(t("modal.error"), { message: detail.error }))
          : detail.data === null || detail.data.groups.length === 0
            ? h("div", { className: "dt-empty" }, t("modal.empty"))
            : detail.data.groups.map((group) => h("div", { key: group.key, className: "dt-group" },
              h("div", { className: "dt-groupTitle" }, t("modal.group." + group.key)),
              group.rows.map((entry) => h("div", { key: entry.code, className: "dt-groupRow" },
                h("span", { className: "dt-groupName" }, entry.name),
                h("span", { className: "dt-groupValue", title: entry.value }, entry.value === "" ? "-" : entry.value)))));

      const logBody = log.loading
        ? h("div", { className: "dt-empty" }, t("modal.loading"))
        : log.error !== ""
          ? notice("error", fill(t("modal.error"), { message: log.error }))
          : log.rows.length === 0
            ? h("div", { className: "dt-empty" }, t("modal.logEmpty"))
            : h(react.Fragment, null,
              log.rows.map((entry) => h(LogRow, { key: entry.id, t, entry })),
              log.more
                ? h("button", {
                  type: "button",
                  className: "dt-btn",
                  disabled: log.loadingMore,
                  onClick: loadMore,
                }, log.loadingMore ? t("modal.moreLoading") : t("modal.more"))
                : null);

      return h("div", {
        className: "dt-modalMask",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": row.title,
        onClick: (event) => {
          if (event.target === event.currentTarget) onClose();
        },
      },
        h("div", { className: "dt-modal" },
          h("div", { className: "dt-modalHead" },
            h("span", { className: "dt-modalId" }, row.id),
            h("h3", { className: "dt-modalTitle", title: row.title }, row.title),
            detailCell(row, t),
            h("span", { style: { flex: "1 1 auto" } }),
            h("button", { type: "button", className: "dt-btn", onClick: onClose }, t("modal.close"))),
          h("div", { className: "dt-modalTabs", role: "tablist" },
            [
              { key: "detail", label: t("modal.detail") },
              { key: "log", label: t("modal.log") },
            ].map((entry) => h("button", {
              key: entry.key,
              type: "button",
              role: "tab",
              className: "dt-modalTab",
              "aria-selected": tabKey === entry.key ? "true" : "false",
              "data-active": tabKey === entry.key ? "" : undefined,
              onClick: () => setTabKey(entry.key),
            }, entry.label))),
          h("div", { className: "dt-modalBody" }, tabKey === "detail" ? detailBody : logBody)));
    }

    /**
     * The id cell: a link into the DevOps web UI. Reminder rows carry no work
     * item id, so they stay plain and unclickable.
     */
    function detailCell(row, t) {
      if (row.id === "") return h("span", { className: "dt-muted" }, "-");
      const systemId = typeof row.systemId === "string" ? row.systemId : "";
      const href = "https://devsecops.midea.com/agile/demand/list?sysId="
        + encodeURIComponent(systemId) + "&detailId=" + encodeURIComponent(row.id);
      return h("a", {
        className: "dt-idBtn",
        href,
        target: "_blank",
        rel: "noreferrer noopener",
        title: t("col.openDetail"),
      }, row.id);
    }

    /** The task-point cell: the tenant's optional float column. */
    function pointsCell(row) {
      const value = row.points;
      if (typeof value !== "number" || !Number.isFinite(value)) return h("span", { className: "dt-muted" }, "-");
      return h("span", { className: "dt-num" }, String(value));
    }

    /** The due cell: date plus an overdue accent, unless the item is done. */
    function endCell(row) {
      const day = dayOf(row.end);
      if (day === "") return h("span", { className: "dt-muted" }, "-");
      // Finished items keep a plain date: an overdue accent would be noise.
      const finished = /完成|关闭|取消|终止|已解决/.test(String(row.status));
      return h("span", {
        className: "dt-mono",
        style: !finished && isOverdue(row.end) ? { color: "var(--dsw-alias-state-error-primary)" } : undefined,
        title: row.end,
      }, day);
    }

    /** The system cell: name above id. */
    function systemCell(row) {
      if (row.system === "") return h("span", { className: "dt-muted" }, "-");
      const parts = String(row.system).split("/");
      return h("span", { title: row.system }, parts[0]);
    }

    /** One person cell: the platform's full "name(account)" text, or "-". */
    function personCell(value) {
      const text = typeof value === "string" ? value.trim() : "";
      if (text === "") return h("span", { className: "dt-muted" }, "-");
      return h("span", { className: "dt-person", title: text }, text);
    }
    // #endregion

    // #region sessions tab
    /** Dialog listing the six card actions. */
    function SessionMenu(props) {
      const t = props.t;
      const item = (label, onClick, options) => h("button", {
        type: "button",
        className: "dt-menuItem",
        "data-danger": options !== undefined && options.danger === true ? "" : undefined,
        onClick: (event) => {
          event.stopPropagation();
          props.onClose();
          onClick();
        },
      }, label);
      return h("div", {
        className: "dt-menu",
        role: "menu",
        onClick: (event) => event.stopPropagation(),
        onKeyDown: (event) => {
          if (event.key === "Escape") props.onClose();
        },
      },
        item(props.row.pinned ? t("sess.unpin") : t("sess.pin"), () => props.onTogglePin(props.row)),
        item(t("sess.rename"), () => props.onRename(props.row)),
        item(t("sess.fork"), () => props.onFork(props.row)),
        item(t("sess.copyId"), () => props.onCopyId(props.row)),
        item(t("sess.openInApp"), () => props.onOpenInApp(props.row)),
        h("div", { className: "dt-menuSep" }),
        item(t("sess.archive"), () => props.onArchive(props.row), { danger: true }));
    }

    /** Note cell: click to edit, Enter or blur saves, Escape reverts. */
    function NoteBox(props) {
      const t = props.t;
      const [editing, setEditing] = react.useState(false);
      const [draft, setDraft] = react.useState(props.note);
      const area = react.useRef(null);
      react.useEffect(() => {
        if (!editing) setDraft(props.note);
      }, [props.note, editing]);
      react.useEffect(() => {
        if (editing && area.current !== null) area.current.focus();
      }, [editing]);
      const save = () => {
        setEditing(false);
        if (draft.trim() === props.note) return;
        props.onSave(draft);
      };
      if (editing) {
        return h("textarea", {
          ref: area,
          className: "dt-noteInput",
          value: draft,
          "aria-label": t("sess.noteAria"),
          placeholder: t("sess.notePlaceholder"),
          onClick: (event) => event.stopPropagation(),
          onChange: (event) => setDraft(event.target.value),
          onBlur: save,
          onKeyDown: (event) => {
            // The card itself opens the session on Enter/Space, so the editor
            // must consume its own keys instead of letting them bubble up.
            if (event.key === "Escape") {
              event.stopPropagation();
              setDraft(props.note);
              setEditing(false);
            } else if (event.key === "Enter" && event.shiftKey === false) {
              event.preventDefault();
              event.stopPropagation();
              save();
            }
          },
        });
      }
      const empty = props.note === "";
      return h("div", {
        className: "dt-cardNote",
        role: "textbox",
        tabIndex: 0,
        "data-empty": empty ? "" : undefined,
        title: t("sess.noteEdit"),
        onClick: (event) => {
          event.stopPropagation();
          setEditing(true);
        },
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setEditing(true);
          }
        },
      }, empty ? t("sess.notePlaceholder") : props.note);
    }

    /** One session card: status dot, title, note, then workspace and figures. */
    function SessionCard(props) {
      const t = props.t;
      const row = props.row;
      const title = row.title === "" ? t("sess.untitled") : row.title;
      const used = agoOf(t, row.updatedAt);
      const tokens = row.tokens === null ? "" : tokenText(row.tokens);
      // Prefer the official pin glyph; fall back to the local drawing when the
      // shell does not export it.
      const officialPin = primitives !== null && primitives !== undefined && typeof primitives.IconPinFillRegular === "function"
        ? primitives.IconPinFillRegular
        : null;
      // Figures belong to the middle band of the card, next to the note.
      const figs = [];
      if (row.turns !== null) {
        figs.push(h("span", { key: "turns", className: "dt-metaItem" }, fill(t("sess.turns"), { n: row.turns })));
      }
      if (tokens !== "") {
        if (figs.length > 0) figs.push(h("span", { key: "sep-tokens", className: "dt-metaSep" }, "·"));
        figs.push(h("span", { key: "tokens", className: "dt-metaItem", title: String(row.tokens) }, fill(t("sess.tokens"), { n: tokens })));
      }
      return h("article", {
        className: "dt-card",
        tabIndex: 0,
        role: "button",
        "data-current": row.current ? "" : undefined,
        "data-highlight": props.highlighted ? "" : undefined,
        "data-pinned": row.pinned ? "" : undefined,
        "data-session-id": row.id,
        "aria-label": title + " · " + row.status.label + (row.workspace === "" ? "" : " · " + row.workspace),
        title: t("sess.openSession"),
        onClick: () => props.onOpen(row),
        onKeyDown: (event) => {
          // Only the card itself opens the session; inner controls keep their keys.
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onOpen(row);
          }
        },
      },
        h("div", { className: "dt-cardTop" },
          h("span", { className: "dt-status", "data-state": row.status.state, title: row.status.label, "aria-label": row.status.label },
            h(StatusDot, { state: row.status.state })),
          h("h3", { className: "dt-cardTitle", title }, title),
          h("span", { className: "dt-cardBtns" },
            h("button", {
              type: "button",
              className: "dt-iconBtn dt-pin",
              "data-on": row.pinned ? "" : undefined,
              "aria-label": row.pinned ? t("sess.unpin") : t("sess.pin"),
              title: row.pinned ? t("sess.unpin") : t("sess.pin"),
              onClick: (event) => {
                event.stopPropagation();
                props.onTogglePin(row);
              },
            }, officialPin === null ? h(PinIcon, { filled: row.pinned }) : h(officialPin, { size: 14 })))),
        h("div", { className: "dt-cardMid" },
          h(NoteBox, { t, note: row.note, onSave: (text) => props.onSaveNote(row, text) }),
          figs.length === 0 ? null : h("div", { className: "dt-cardFigs" }, figs)),
        h("div", { className: "dt-cardBottom" },
          h("span", { key: "ws-wrap", className: "dt-ws-wrap" },
            h(FolderIcon),
            h("span", { className: "dt-ws", title: row.cwd === "" ? row.workspace : row.cwd }, row.workspace === "" ? t("sess.ungrouped") : row.workspace)),
          h("span", { className: "dt-metaTime" }, used),
          h("span", { className: "dt-cardBtns" },
            h("button", {
              type: "button",
              className: "dt-iconBtn dt-locate",
              title: t("sess.locateHint"),
              "aria-label": t("sess.locate"),
              onClick: (event) => {
                event.stopPropagation();
                props.onLocate(row);
              },
            }, h(LocateIcon)),
            h("button", {
              type: "button",
              className: "dt-iconBtn dt-chat",
              title: t("sess.chatHint"),
              "aria-label": t("sess.chat"),
              onClick: (event) => {
                event.stopPropagation();
                props.onChat(row);
              },
            }, h(ChatIcon)),
            h("button", {
              type: "button",
              className: "dt-iconBtn dt-more",
              "aria-label": t("sess.actions"),
              "aria-haspopup": "menu",
              "aria-expanded": props.menuOpen ? "true" : "false",
              title: "⋯",
              onClick: (event) => {
                event.stopPropagation();
                props.onToggleMenu(row);
              },
            }, h(KebabIcon)))),
        props.menuOpen ? h(SessionMenu, props.menu) : null);
    }

    /** Modal asking for a new session title. */
    function RenameDialog(props) {
      const t = props.t;
      const [value, setValue] = react.useState(props.initial);
      const input = react.useRef(null);
      react.useEffect(() => {
        if (input.current !== null) {
          input.current.focus();
          input.current.select();
        }
      }, []);
      const commit = () => {
        const next = value.trim();
        if (next === "") return;
        props.onConfirm(next);
      };
      return h("div", { className: "dt-overlay", role: "dialog", "aria-modal": "true", onClick: props.onCancel },
        h("div", { className: "dt-dialog", onClick: (event) => event.stopPropagation() },
          h("h3", { className: "dt-dialogTitle" }, t("sess.renameTitle")),
          h("input", {
            ref: input,
            className: "dt-input",
            value,
            placeholder: t("sess.renamePlaceholder"),
            "aria-label": t("sess.renamePlaceholder"),
            onChange: (event) => setValue(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") props.onCancel();
            },
          }),
          h("div", { className: "dt-dialogRow" },
            h("button", { type: "button", className: "dt-btn", onClick: props.onCancel }, t("sess.cancel")),
            h("button", { type: "button", className: "dt-btn", disabled: value.trim() === "", onClick: commit }, t("sess.ok")))));
    }

    /** Modal confirming a stop-and-archive of a running session. */
    function ArchiveDialog(props) {
      const t = props.t;
      return h("div", { className: "dt-overlay", role: "dialog", "aria-modal": "true", onClick: props.onCancel },
        h("div", { className: "dt-dialog", onClick: (event) => event.stopPropagation() },
          h("h3", { className: "dt-dialogTitle" }, t("sess.archiveConfirmTitle")),
          h("div", { className: "dt-dialogBody" }, fill(t("sess.archiveConfirmBody"), { title: props.title === "" ? t("sess.untitled") : props.title })),
          h("div", { className: "dt-dialogRow" },
            h("button", { type: "button", className: "dt-btn", onClick: props.onCancel }, t("sess.cancel")),
            h("button", { type: "button", className: "dt-btn", onClick: props.onConfirm }, t("sess.archiveConfirm")))));
    }

    /** Modal that sends one plain-text prompt into a session's inbox. */
    function ChatDialog(props) {
      const t = props.t;
      const [text, setText] = react.useState("");
      const [sending, setSending] = react.useState(false);
      const area = react.useRef(null);
      react.useEffect(() => {
        if (area.current !== null) area.current.focus();
      }, []);
      const send = () => {
        const body = text.trim();
        if (body === "" || sending) return;
        setSending(true);
        Promise.resolve(props.onSend(body)).then(() => {
          setSending(false);
          props.onSent();
        }).catch(() => setSending(false));
      };
      const title = props.title === "" ? t("sess.untitled") : props.title;
      return h("div", { className: "dt-overlay", role: "dialog", "aria-modal": "true", onClick: props.onCancel },
        h("div", { className: "dt-dialog dt-chatDialog", onClick: (event) => event.stopPropagation() },
          h("h3", { className: "dt-dialogTitle" }, fill(t("sess.chatTitle"), { title })),
          h("textarea", {
            ref: area,
            className: "dt-chatText",
            value: text,
            rows: 4,
            placeholder: t("sess.chatPlaceholder"),
            "aria-label": t("sess.chatPlaceholder"),
            onChange: (event) => setText(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Escape") props.onCancel();
              if (event.key === "Enter" && event.shiftKey === false) {
                event.preventDefault();
                send();
              }
            },
          }),
          h("div", { className: "dt-dialogRow" },
            h("span", { className: "dt-muted", style: { fontSize: "11.5px", marginRight: "auto" } }, t("sess.chatHelp")),
            h("button", { type: "button", className: "dt-btn", onClick: props.onCancel }, t("sess.cancel")),
            h("button", {
              type: "button",
              className: "dt-btn",
              "data-primary": "",
              disabled: text.trim() === "" || sending,
              onClick: send,
            }, sending ? t("sess.sending") : t("sess.send")))));
    }

    /** The sessions tab: workspace filter, search, and the card grid. */
    function SessionsView(props) {
      const t = props.t;
      const ops = props.ops;
      const list = useSource(props.sessions !== undefined && props.sessions !== null ? props.sessions.list : null);
      const statuses = useSource(props.uiSession !== undefined && props.uiSession !== null ? props.uiSession.sessionStatus : null);
      const workspaces = useSource(props.workspaces !== undefined && props.workspaces !== null ? props.workspaces.list : null);
      const [filter, setFilter] = react.useState("all");
      const [query, setQuery] = react.useState("");
      const [menuFor, setMenuFor] = react.useState(null);
      const [renaming, setRenaming] = react.useState(null);
      const [archiving, setArchiving] = react.useState(null);
      const [chatting, setChatting] = react.useState(null);
      const [page, setPage] = react.useState(1);
      const [pageSize, setPageSize] = react.useState(20);
      const [toast, setToast] = react.useState(null);
      // Workspaces chosen in the highlight picker get a border on their cards.
      const [highlight, setHighlight] = react.useState([]);
      const [hlOpen, setHlOpen] = react.useState(false);
      const hlRef = react.useRef(null);
      // Note edits live in localStorage, so a counter is enough to redraw them.
      const [, bumpNotes] = react.useState(0);
      const requested = react.useRef(new Set());

      const notify = react.useCallback((text, kind) => {
        setToast({ text, kind: kind === undefined ? "error" : kind });
        setTimeout(() => setToast((prev) => (prev !== null && prev.text === text ? null : prev)), 2600);
      }, []);

      const rows = sessionRows(t, list, statuses, workspaces);
      const workspaceItems = workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.items) ? workspaces.items : [];
      const highlightSet = new Set(highlight);
      const toggleHighlight = (id) => {
        setHighlight((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : prev.concat(id)));
      };

      // Close the card menu on any outside click or Escape. A click inside the
      // open menu must survive: the menu items act on `click`, and removing the
      // menu on `mousedown` would swallow every one of those actions.
      react.useEffect(() => {
        if (menuFor === null) return undefined;
        const onDown = (event) => {
          const target = event.target;
          if (target !== null && target !== undefined && typeof target.closest === "function" && target.closest(".dt-menu") !== null) return;
          setMenuFor(null);
        };
        const onKey = (event) => {
          if (event.key === "Escape") setMenuFor(null);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
          document.removeEventListener("mousedown", onDown);
          document.removeEventListener("keydown", onKey);
        };
      }, [menuFor]);

      // Close the highlight picker on any click elsewhere.
      react.useEffect(() => {
        if (!hlOpen) return undefined;
        const onDown = (event) => {
          if (hlRef.current !== null && !hlRef.current.contains(event.target)) setHlOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
      }, [hlOpen]);

      const fail = (prefix) => (error) => notify(fill(prefix, { message: reasonOf(error) }));
      const successfully = (action, message) => {
        Promise.resolve(action).then(() => {
          if (message !== undefined) notify(message, "ok");
        }).catch(fail(prefixOf("sess.actionFailed", t)));
      };

      const open = (row) => ops.open(row.id);
      const chat = (row) => {
        setChatting(row);
      };
      const sendChat = (row, text) => ops.send(row.id, text).then(() => {
        notify(t("sess.sent"), "ok");
      }).catch(fail(prefixOf("sess.sendFailed", t)));
      const togglePin = (row) => {
        successfully(row.pinned ? ops.unpin(row.id) : ops.pin(row.id));
      };
      const copyId = (row) => {
        copyText(row.id).then((ok) => notify(ok ? t("sess.copied") : t("sess.copyFailed"), ok ? "ok" : "error"));
      };
      const openInApp = (row) => {
        const path = row.cwd;
        if (path === "") {
          notify(fill(t("sess.openFailed"), { message: t("sess.ungrouped") }));
          return;
        }
        Promise.resolve(ops.openInApp(path)).catch(fail(t("sess.openFailed")));
      };
      const fork = (row) => {
        successfully(ops.fork(row.id));
      };
      const archive = (row) => {
        if (row.running) {
          setArchiving(row);
          return;
        }
        successfully(ops.archive(row.id, false));
      };
      const locate = (row) => {
        Promise.resolve(ops.locate(row)).then((found) => {
          if (found !== true) notify(t("sess.locateFailed"));
        }).catch(fail(t("sess.locateFailed")));
      };
      const saveNote = (row, text) => {
        setNote(row.id, text);
        bumpNotes((value) => value + 1);
      };

      const needle = query.trim().toLowerCase();
      const visible = rows.filter((row) => {
        if (filter === "ungrouped" && row.workspaceId !== "") return false;
        if (filter !== "all" && filter !== "ungrouped" && row.workspaceId !== filter) return false;
        if (needle === "") return true;
        return row.title.toLowerCase().includes(needle)
          || (row.workspace !== "" && row.workspace.toLowerCase().includes(needle))
          || (row.note !== "" && row.note.toLowerCase().includes(needle));
      });

      // Cards are paged in the view only; `visible` stays the whole filter result
      // so the footer can still report the true count.
      const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
      const safePage = Math.min(page, pageCount);
      const pageRows = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

      // A new filter, search or page size rebases the list at its first page.
      react.useEffect(() => {
        setPage(1);
      }, [filter, query, pageSize]);

      // Turns and tokens are projections, which the session summary excludes.
      // Ask the session controller for them lazily, a few cards at a time; the
      // store then re-renders with the figures filled in.
      react.useEffect(() => {
        const service = props.sessions;
        if (service === null || service === undefined || typeof service.refreshProjections !== "function") return;
        const pending = visible
          .filter((row) => row.turns === null && row.tokens === null && !requested.current.has(row.id))
          .slice(0, 120);
        if (pending.length === 0) return;
        for (const row of pending) requested.current.add(row.id);
        const queue = pending.slice();
        const worker = async () => {
          for (;;) {
            const row = queue.shift();
            if (row === undefined) return;
            try {
              await service.refreshProjections(row.id);
            } catch {
              /* a missing projection only leaves the card without figures */
            }
          }
        };
        for (let index = 0; index < 4; index += 1) void worker();
      });

      const menuProps = (row) => ({
        t,
        row,
        onClose: () => setMenuFor(null),
        onTogglePin: togglePin,
        onRename: (target) => {
          setRenaming(target);
        },
        onFork: fork,
        onCopyId: copyId,
        onOpenInApp: openInApp,
        onArchive: archive,
      });

      return h(react.Fragment, null,
        h("div", { className: "dt-toolbar" },
          h("label", { className: "dt-muted", style: { fontSize: "12px" }, htmlFor: "dt-ws-filter" }, t("sess.filterWorkspace")),
          h("select", {
            id: "dt-ws-filter",
            className: "dt-select",
            value: filter,
            "aria-label": t("sess.filterWorkspace"),
            onChange: (event) => setFilter(event.target.value),
          },
            h("option", { value: "all" }, t("sess.allWorkspaces")),
            workspaceItems.map((workspace) => h("option", { key: workspace.workspaceId, value: workspace.workspaceId },
              workspace.title === "" ? workspace.path : workspace.title)),
            h("option", { value: "ungrouped" }, t("sess.ungrouped"))),
          h("div", { className: "dt-picker", ref: hlRef },
            h("button", {
              type: "button",
              className: "dt-btn",
              "data-active": highlight.length > 0 ? "" : undefined,
              title: t("sess.highlight"),
              onClick: () => setHlOpen((open) => !open),
            }, highlight.length === 0 ? t("sess.highlight") : fill(t("sess.highlightCount"), { n: highlight.length })),
            hlOpen
              ? h("div", { className: "dt-pickerMenu", role: "group", "aria-label": t("sess.highlight") },
                h("div", { className: "dt-pickerHead" },
                  h("button", { type: "button", className: "dt-btn", onClick: () => setHighlight([]) }, t("sess.highlightClear"))),
                workspaceItems.length === 0
                  ? h("span", { className: "dt-muted", style: { fontSize: "12px" } }, t("sess.highlightEmpty"))
                  : workspaceItems.map((workspace) => h("label", { key: workspace.workspaceId, className: "dt-pickerItem" },
                    h("input", {
                      type: "checkbox",
                      checked: highlightSet.has(workspace.workspaceId),
                      onChange: () => toggleHighlight(workspace.workspaceId),
                    }),
                    h("span", null, workspace.title === "" ? workspace.path : workspace.title))))
              : null),
          h("input", {
            className: "dt-input",
            type: "search",
            value: query,
            placeholder: t("sess.search"),
            "aria-label": t("sess.search"),
            onChange: (event) => setQuery(event.target.value),
          }),
          h("span", { className: "dt-spacer" }),
          h("span", { className: "dt-muted", style: { fontSize: "11.5px" } }, t("sess.hint"))),

        h("div", { className: "dt-body" },
          visible.length === 0
            ? h("div", { className: "dt-empty" }, rows.length === 0 ? t("sess.empty") : t("sess.emptyFilter"))
            : h("div", { className: "dt-cards" },
              pageRows.map((row) => h(SessionCard, {
                key: row.id,
                t,
                row,
                highlighted: row.workspaceId !== "" && highlightSet.has(row.workspaceId),
                menuOpen: menuFor === row.id,
                onOpen: open,
                onTogglePin: togglePin,
                onLocate: locate,
                onChat: chat,
                onSaveNote: saveNote,
                onToggleMenu: (target) => setMenuFor((prev) => (prev === target.id ? null : target.id)),
                menu: menuProps(row),
              }))),
          h("div", {
            className: "dt-footer",
            style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
            "data-archived": String(workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.archivedSessionIds) ? workspaces.archivedSessionIds.length : 0),
          },
            h("span", null, fill(t("sess.count"), { n: visible.length })),
            h("span", { style: { flex: "1 1 auto" } }),
            visible.length === 0 ? null : h("div", { className: "dt-pager" },
              h("select", {
                className: "dt-select",
                value: String(pageSize),
                "aria-label": t("pager.size"),
                title: t("pager.size"),
                onChange: (event) => setPageSize(Number(event.target.value)),
              }, [20, 50, 100].map((size) => h("option", { key: size, value: String(size) }, fill(t("pager.sizeOption"), { n: size })))),
              h("button", { type: "button", className: "dt-btn", disabled: safePage <= 1, onClick: () => setPage(safePage - 1) }, t("pager.prev")),
              h("span", null, fill(t("pager.info"), { page: safePage, pages: pageCount, n: visible.length })),
              h("button", { type: "button", className: "dt-btn", disabled: safePage >= pageCount, onClick: () => setPage(safePage + 1) }, t("pager.next"))))),

        renaming === null ? null : h(RenameDialog, {
          t,
          initial: renaming.title,
          onCancel: () => setRenaming(null),
          onConfirm: (title) => {
            const target = renaming;
            setRenaming(null);
            successfully(ops.rename(target.id, title));
          },
        }),

        archiving === null ? null : h(ArchiveDialog, {
          t,
          title: archiving.title,
          onCancel: () => setArchiving(null),
          onConfirm: () => {
            const target = archiving;
            setArchiving(null);
            successfully(ops.archive(target.id, true));
          },
        }),

        chatting === null ? null : h(ChatDialog, {
          t,
          title: chatting.title,
          onCancel: () => setChatting(null),
          onSend: (text) => sendChat(chatting, text),
          onSent: () => setChatting(null),
        }),

        toast === null ? null : h("div", { className: "dt-toast", "data-kind": toast.kind, role: "status" }, toast.text));
    }

    /** Localised prefix lookup for action failures. */
    function prefixOf(key, t) {
      return t(key);
    }
    // #endregion

    /** The panel root: header plus the two tabs. */
    function Panel(props) {
      const t = props.t;
      const [tab, setTab] = react.useState("sessions");
      const tabs = [
        { id: "sessions", label: t("tab.sessions") },
        { id: "devops", label: t("tab.devops") },
      ];
      return h("div", { className: "dt-panel" },
        h("div", { className: "dt-header" },
          h("button", { type: "button", className: "dt-btn", onClick: props.onBack, title: t("panel.back") }, "‹"),
          h("h2", { className: "dt-title" }, t("panel.title")),
          h("div", { className: "dt-seg", role: "tablist" },
            tabs.map((entry) => h("button", {
              key: entry.id,
              type: "button",
              className: "dt-segBtn",
              role: "tab",
              "data-active": tab === entry.id ? "" : undefined,
              "aria-selected": tab === entry.id ? "true" : "false",
              onClick: () => setTab(entry.id),
            }, entry.label)))),
        tab === "sessions"
          ? h(SessionsView, {
            t,
            sessions: props.sessions,
            uiSession: props.uiSession,
            workspaces: props.workspaces,
            ops: props.ops,
          })
          : h(DevopsView, { t, api: props.api }));
    }

    /** Register the sidebar entry and the panel it opens. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-devops-tasks: dictionaries");
      ctx.effect(() => installStyles(), "dsh-devops-tasks: styles");
      const t = ctx.locale.bind(NS);
      const api = new DevopsApi();
      // Services are resolved through the injected names; `ctx.get` keeps the
      // module loadable when a context exposes them as plain properties.
      const service = (name) => {
        try {
          const found = typeof ctx.get === "function" ? ctx.get(name) : undefined;
          if (found !== undefined && found !== null) return found;
        } catch {
          /* fall through to the property */
        }
        return ctx[name];
      };
      const uiWorkspace = service("uiWorkspace");
      const remote = ctx.remote;
      // Every remote namespace is also its own service (`remote.session`), and a
      // cordis value is only reachable once its name is injected. Read it by the
      // injected name, with the facade property as the fallback, so a missing
      // binding reports itself instead of silently doing nothing.
      const sessionRemote = () => {
        try {
          const direct = ctx.get("remote.session");
          if (direct !== undefined && direct !== null) return direct;
        } catch {
          /* fall through to the facade */
        }
        try {
          const facade = remote !== null && remote !== undefined ? remote.session : undefined;
          if (facade !== undefined && facade !== null) return facade;
        } catch {
          /* fall through to the error */
        }
        throw new Error(t("sess.sessionServiceMissing"));
      };
      const ops = {
        open(sessionId) {
          // The platform refuses to reopen archived sessions; so do we, instead
          // of letting the shell swap the conversation view for nothing.
          const snapshot = service("workspaces");
          const listed = snapshot !== null && snapshot !== undefined && snapshot.list !== undefined && typeof snapshot.list.getSnapshot === "function"
            ? snapshot.list.getSnapshot()
            : null;
          if (listed !== null && Array.isArray(listed.archivedSessionIds) && listed.archivedSessionIds.includes(sessionId)) return;
          uiWorkspace.openSession(sessionId);
        },
        send(sessionId, text) {
          const requestId = typeof crypto !== "undefined" && crypto !== null && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "dt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
          // `remote.session` is its own service (`remote.<namespace>`), so it is
          // resolved like every other service: through the injected name first,
          // then through the remote facade. Resolving inside a promise keeps a
          // missing service a visible failure instead of a silent throw.
          return Promise.resolve().then(() => {
            const target = sessionRemote();
            return target.prompt({
              requestId,
              sessionId,
              mode: "queue",
              content: [{ type: "text", text }],
            });
          }).then(unwrap);
        },
        pin(sessionId) {
          return uiWorkspace.pinSession(sessionId);
        },
        unpin(sessionId) {
          return uiWorkspace.unpinSession(sessionId);
        },
        fork(sessionId) {
          return uiWorkspace.forkSession(sessionId).then((childId) => {
            uiWorkspace.openSession(childId);
            return childId;
          });
        },
        rename(sessionId, title) {
          return Promise.resolve().then(() => sessionRemote().rename({ sessionId, title })).then(unwrap);
        },
        openInApp(path) {
          return Promise.resolve().then(() => sessionRemote().openWorkspacePath({ path })).then(unwrap);
        },
        archive(sessionId, stopActivity) {
          return uiWorkspace.archiveSession(sessionId, { stopActivity: stopActivity === true });
        },
        async locate(row) {
          return revealInSidebar(ctx.layout, row);
        },
      };

      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          api,
          t,
          ops,
          sessions: service("sessions"),
          uiSession: service("uiSession"),
          workspaces: service("workspaces"),
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
    exports.inject = ["slots", "locale", "layout", "remote", "remote.session", "sessions", "uiSession", "uiWorkspace", "workspaces"];
    return module.exports;
  },
});
