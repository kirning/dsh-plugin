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
      ".dt-body{display:flex;flex:1;flex-direction:column;gap:10px;min-height:0;overflow-y:auto}",
      ".dt-tableWrap{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:auto}",
      ".dt-table{border-collapse:collapse;width:100%;font-size:12.5px}",
      ".dt-table th{position:sticky;top:0;z-index:1;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;text-align:left;white-space:nowrap}",
      ".dt-table td{padding:7px 10px;border-bottom:1px solid var(--dsw-alias-separator-primary);vertical-align:middle}",
      ".dt-table tbody tr:last-child td{border-bottom:none}",
      ".dt-table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}",
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
      ".dt-ws-wrap{display:inline-flex;flex:none;align-items:center;gap:4px;min-width:0;max-width:52%}",
      ".dt-ws{min-width:0;overflow:hidden;text-overflow:ellipsis}",
      ".dt-metaItem{flex:none;font-variant-numeric:tabular-nums}",
      ".dt-metaSep{flex:none;opacity:.6}",
      ".dt-metaTime{flex:none;margin-left:auto;padding-left:4px}",
      "[data-dt-locate]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px;border-radius:8px;animation:dt-pulse 1.8s ease-out}",
      "@keyframes dt-pulse{0%{background:var(--dsw-alias-state-business-primary);opacity:.5}100%{background:transparent;opacity:1}}",
      ".dt-cardBtns{display:flex;align-items:center;gap:2px;margin-left:auto}",
      ".dt-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:none;border-radius:6px;background:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;transition:opacity .12s,background .12s,color .12s}",
      ".dt-card:hover .dt-iconBtn,.dt-card:focus-within .dt-iconBtn,.dt-iconBtn[data-on]{opacity:1}",
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
      "count.todo": "待办",
      "count.review": "待审",
      "count.created": "我创建的",
      "count.empty": "暂无",
      "col.id": "编号",
      "col.title": "标题",
      "col.type": "类型",
      "col.status": "状态",
      "col.priority": "优先级",
      "col.points": "任务点数",
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
      "count.todo": "To do",
      "count.review": "To review",
      "count.created": "Created",
      "count.empty": "none",
      "col.id": "ID",
      "col.title": "Title",
      "col.type": "Type",
      "col.status": "Status",
      "col.priority": "Priority",
      "col.points": "Task points",
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
        rows.push({
          id,
          title: rawTitle,
          cwd,
          workspace: workspace !== undefined && typeof workspace.title === "string" && workspace.title !== "" ? workspace.title : baseName(cwd),
          workspaceId: workspace !== undefined ? workspace.workspaceId : "",
          status: statusOf(t, status),
          pinned: pinned.has(id),
          rank: pinnedIndex,
          updatedAt: typeof summary.updatedAt === "number" ? summary.updatedAt : 0,
          current: summary.retainedBy !== undefined && summary.retainedBy !== null && (summary.retainedBy.mainView ?? 0) > 0,
          running: (status !== undefined && status.running === true) || summary.running === true,
          turns: stats !== null && stats !== undefined && typeof stats.turns === "number" ? stats.turns : null,
          tokens: tokensOf(values.tokenUsage),
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

    /** Pin glyph: filled when pinned, outline while it is only a hover action. */
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
        h("path", { d: "M8 1.9c1.9 0 3.3 1.5 3.3 3.3 0 2.4-3.3 5.4-3.3 5.4S4.7 7.6 4.7 5.2c0-1.8 1.4-3.3 3.3-3.3z" }),
        h("path", { d: "M8 11.4v2.7" }));
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

    /** The DevOps tab: counts, three buckets, search, table. */
    function DevopsView(props) {
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
          { key: "points", label: t("col.points"), render: (row) => pointsCell(row) },
          { key: "end", label: t("col.end"), render: (row) => endCell(row) },
          { key: "system", label: t("col.system"), render: (row) => systemCell(row) },
        ]
        : [
          { key: "id", label: t("col.id"), render: (row) => idCell(row, t, onCopy, copied) },
          { key: "title", label: t("col.title"), render: (row) => row.title },
          { key: "type", label: t("col.type"), render: (row) => row.type === "" ? h("span", { className: "dt-muted" }, "-") : row.type },
          { key: "status", label: t("col.status"), render: (row) => chip(row.status, statusTone(row)) },
          { key: "priority", label: t("col.priority"), render: (row) => chip(row.priority, priorityTone(row.priority)) },
          { key: "points", label: t("col.points"), render: (row) => pointsCell(row) },
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

      return h(react.Fragment, null,
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
          h("span", { className: "dt-muted", style: { fontSize: "11.5px" } }, t("hint." + tab)),
          stateChip,
          snap.loading ? h("span", { className: "dt-spinner", role: "status", "aria-label": t("common.loading") }) : null,
          h("button", { type: "button", className: "dt-btn", disabled: snap.loading, onClick: () => snap.refresh(true) }, t("common.refresh"))),

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

    /** The task-point cell: the tenant's optional float column. */
    function pointsCell(row) {
      const value = row.points;
      if (typeof value !== "number" || !Number.isFinite(value)) return h("span", { className: "dt-muted" }, "-");
      return h("span", { className: "dt-num" }, String(value));
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
      const meta = [
        h("span", { key: "ws-wrap", className: "dt-ws-wrap" },
          h(FolderIcon),
          h("span", { className: "dt-ws", title: row.cwd === "" ? row.workspace : row.cwd }, row.workspace === "" ? t("sess.ungrouped") : row.workspace)),
      ];
      if (row.turns !== null) {
        meta.push(h("span", { key: "sep-turns", className: "dt-metaSep" }, "·"));
        meta.push(h("span", { key: "turns", className: "dt-metaItem" }, fill(t("sess.turns"), { n: row.turns })));
      }
      if (tokens !== "") {
        meta.push(h("span", { key: "sep-tokens", className: "dt-metaSep" }, "·"));
        meta.push(h("span", { key: "tokens", className: "dt-metaItem", title: String(row.tokens) }, fill(t("sess.tokens"), { n: tokens })));
      }
      if (used !== "") meta.push(h("span", { key: "used", className: "dt-metaTime" }, used));
      return h("article", {
        className: "dt-card",
        tabIndex: 0,
        role: "button",
        "data-current": row.current ? "" : undefined,
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
              className: "dt-iconBtn dt-pin",
              "data-on": row.pinned ? "" : undefined,
              "aria-label": row.pinned ? t("sess.unpin") : t("sess.pin"),
              title: row.pinned ? t("sess.unpin") : t("sess.pin"),
              onClick: (event) => {
                event.stopPropagation();
                props.onTogglePin(row);
              },
            }, h(PinIcon, { filled: row.pinned })),
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
        h(NoteBox, { t, note: row.note, onSave: (text) => props.onSaveNote(row, text) }),
        h("div", { className: "dt-cardMeta" }, meta),
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
      const [toast, setToast] = react.useState(null);
      // Note edits live in localStorage, so a counter is enough to redraw them.
      const [, bumpNotes] = react.useState(0);
      const requested = react.useRef(new Set());

      const notify = react.useCallback((text, kind) => {
        setToast({ text, kind: kind === undefined ? "error" : kind });
        setTimeout(() => setToast((prev) => (prev !== null && prev.text === text ? null : prev)), 2600);
      }, []);

      const rows = sessionRows(t, list, statuses, workspaces);
      const workspaceItems = workspaces !== null && workspaces !== undefined && Array.isArray(workspaces.items) ? workspaces.items : [];

      // Close the card menu on any outside click or Escape.
      react.useEffect(() => {
        if (menuFor === null) return undefined;
        const onDown = () => setMenuFor(null);
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

      const fail = (prefix) => (error) => notify(fill(prefix, { message: reasonOf(error) }));
      const successfully = (action, message) => {
        Promise.resolve(action).then(() => {
          if (message !== undefined) notify(message, "ok");
        }).catch(fail(prefixOf("sess.actionFailed", t)));
      };

      const open = (row) => ops.open(row.id);
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

      // Turns and tokens are projections, which the session summary excludes.
      // Ask the session controller for them lazily, a few cards at a time; the
      // store then re-renders with the figures filled in.
      react.useEffect(() => {
        const service = props.sessions;
        if (service === null || service === undefined || typeof service.refreshProjections !== "function") return;
        const pending = visible
          .filter((row) => row.turns === null && !requested.current.has(row.id))
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
              visible.map((row) => h(SessionCard, {
                key: row.id,
                t,
                row,
                menuOpen: menuFor === row.id,
                onOpen: open,
                onTogglePin: togglePin,
                onLocate: locate,
                onSaveNote: saveNote,
                onToggleMenu: (target) => setMenuFor((prev) => (prev === target.id ? null : target.id)),
                menu: menuProps(row),
              }))),
          h("div", { className: "dt-footer" }, fill(t("sess.count"), { n: visible.length }))),

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
      const ops = {
        open(sessionId) {
          uiWorkspace.openSession(sessionId);
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
          return remote.session.rename({ sessionId, title }).then(unwrap);
        },
        openInApp(path) {
          return remote.session.openWorkspacePath({ path }).then(unwrap);
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
    exports.inject = ["slots", "locale", "layout", "remote", "sessions", "uiSession", "uiWorkspace", "workspaces"];
    return module.exports;
  },
});
