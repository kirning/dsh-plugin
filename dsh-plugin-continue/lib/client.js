window.__ModuleLoader__.load({ id: "dsh-plugin-continue", factory: (require) => {
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

// src/client/ContinueAction.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/instructions.ts
var import_dsh_client_store = require("@deepseek-ai/dsh-client-store");
var BUILTIN_INSTRUCTION_ID = "continue";
var BUILTIN_INSTRUCTION_TEXT = "\u7EE7\u7EED";
var PERSIST_KEY = "dsh-plugin-continue/instructions";
function nextId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function normalize(state) {
  const ok = Array.isArray(state.custom) && state.custom.every((entry) => entry !== null && typeof entry === "object" && typeof entry.id === "string" && typeof entry.text === "string");
  return ok ? state : { custom: [] };
}
function listInstructions(state) {
  return [
    { id: BUILTIN_INSTRUCTION_ID, text: BUILTIN_INSTRUCTION_TEXT, builtin: true },
    ...state.custom.map((entry) => ({ id: entry.id, text: entry.text, builtin: false }))
  ];
}
var InstructionsController = class {
  /** 供渲染器合成 `useInstructions` 选择器 hook 的快照 store。 */
  store;
  constructor() {
    this.store = (0, import_dsh_client_store.createSnapshotStore)(
      { custom: [] },
      { persist: { name: PERSIST_KEY } }
    );
    const snapshot = this.store.getSnapshot();
    const normalized = normalize(snapshot);
    if (normalized !== snapshot) this.store.set(normalized);
  }
  /** 新增一条自定义指令（空白内容被忽略）。 */
  add(text) {
    const trimmed = text.trim();
    if (trimmed === "") return;
    const { custom } = this.store.getSnapshot();
    this.store.set({ custom: [...custom, { id: nextId(), text: trimmed }] });
  }
  /** 修改一条自定义指令（内置指令不在此列，天然不可修改）。 */
  update(id, text) {
    const trimmed = text.trim();
    if (trimmed === "") return;
    const { custom } = this.store.getSnapshot();
    this.store.set({ custom: custom.map((entry) => entry.id === id ? { id, text: trimmed } : entry) });
  }
  /** 删除一条自定义指令（内置指令不在此列，天然不可删除）。 */
  remove(id) {
    const { custom } = this.store.getSnapshot();
    this.store.set({ custom: custom.filter((entry) => entry.id !== id) });
  }
};

// src/client/ContinueAction.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function FolderOpenIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z", fill: "currentColor" }) });
}
function ContinueAction(props) {
  const { inputActions, openDirectory, cwd, t, useInstructions } = props;
  const [open, setOpen] = (0, import_react.useState)(false);
  const state = useInstructions((snapshot) => snapshot);
  const instructions = listInstructions(state);
  const primary = instructions[0];
  const items = instructions.map((item) => ({ id: item.id, label: item.text }));
  const send = (text) => {
    inputActions.setDraft(text);
    inputActions.submit();
  };
  const select = (id) => {
    const instruction = instructions.find((item) => item.id === id);
    if (instruction === void 0) return;
    send(instruction.text);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-continue-split", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-continue-action dsh-continue-label",
          "data-continue-action": true,
          title: t("sendNow.title", { text: primary.text }),
          "aria-label": t("sendNow.aria", { text: primary.text }),
          onClick: () => {
            send(primary.text);
          },
          children: primary.text
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_dsh_client_ui_primitives.Menu,
        {
          portal: true,
          compact: true,
          open,
          items,
          onClose: () => {
            setOpen(false);
          },
          onSelect: (id) => {
            setOpen(false);
            select(id);
          },
          anchor: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh-continue-action dsh-continue-caret",
              "data-continue-menu": true,
              title: t("title"),
              "aria-label": t("dropdown.aria"),
              "aria-haspopup": "menu",
              "aria-expanded": open,
              onClick: () => {
                setOpen((previous) => !previous);
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14, className: "dsh-continue-chevron" })
            }
          )
        }
      )
    ] }),
    cwd !== void 0 && cwd !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "dsh-continue-icon-action",
        "data-open-directory": true,
        title: t("openDirectory.title"),
        "aria-label": t("openDirectory.aria"),
        onClick: () => {
          openDirectory(cwd);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpenIcon, {})
      }
    )
  ] });
}

// src/client/InstructionsSection.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
function CustomRow({ instruction, t, onUpdate, onRemove }) {
  const [editing, setEditing] = (0, import_react2.useState)(false);
  const [draft, setDraft] = (0, import_react2.useState)(instruction.text);
  const save = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    onUpdate(instruction.id, trimmed);
    setEditing(false);
  };
  if (editing) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { className: "dsh-instruction-row dsh-instruction-row-editing", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_dsh_client_ui_primitives2.Input,
        {
          className: "dsh-instruction-input",
          value: draft,
          autoFocus: true,
          spellCheck: false,
          "aria-label": t("editAria"),
          onChange: (event) => {
            setDraft(event.target.value);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter") save();
            else if (event.key === "Escape") setEditing(false);
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { size: "sm", variant: "primary", disabled: draft.trim() === "", onClick: save, children: t("save") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { size: "sm", variant: "outline", onClick: () => {
        setEditing(false);
      }, children: t("cancel") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { className: "dsh-instruction-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-instruction-text", title: instruction.text, children: instruction.text }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_dsh_client_ui_primitives2.Button,
      {
        size: "sm",
        variant: "ghost",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconEditOutlineRegular, { size: 16 }),
        "aria-label": t("editAria"),
        onClick: () => {
          setDraft(instruction.text);
          setEditing(true);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_dsh_client_ui_primitives2.Button,
      {
        size: "sm",
        variant: "ghost",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconTrashOutlineRegular, { size: 16 }),
        "aria-label": t("deleteAria"),
        onClick: () => {
          onRemove(instruction.id);
        }
      }
    )
  ] });
}
function InstructionsSection(props) {
  const { useInstructions, add, update, remove, t } = props;
  const state = useInstructions((snapshot) => snapshot);
  const instructions = listInstructions(state);
  const builtin = instructions.filter((item) => item.builtin);
  const custom = instructions.filter((item) => !item.builtin);
  const [draft, setDraft] = (0, import_react2.useState)("");
  const submitNew = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    add(trimmed);
    setDraft("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-instructions-section", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "dsh-instructions-title", children: t("sectionTitle") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsh-instructions-intro", children: t("sectionIntro") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-instruction-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "dsh-instruction-group-head", children: t("builtinGroup") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "dsh-instruction-list", children: builtin.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { className: "dsh-instruction-row dsh-instruction-row-builtin", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-instruction-text", title: item.text, children: item.text }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-instruction-badge", children: t("builtinBadge") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-instruction-hint", children: t("builtinHint") })
      ] }, item.id)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-instruction-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: "dsh-instruction-group-head", children: t("customGroup") }),
      custom.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "dsh-instruction-empty", children: t("customEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "dsh-instruction-list", children: custom.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        CustomRow,
        {
          instruction: item,
          t,
          onUpdate: update,
          onRemove: remove
        },
        item.id
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "form",
        {
          className: "dsh-instruction-new",
          onSubmit: (event) => {
            event.preventDefault();
            submitNew();
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Input,
              {
                className: "dsh-instruction-input",
                value: draft,
                spellCheck: false,
                placeholder: t("addPlaceholder"),
                "aria-label": t("addPlaceholder"),
                onChange: (event) => {
                  setDraft(event.target.value);
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Button,
              {
                size: "sm",
                variant: "primary",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconPlusOutlineRegular, { size: 16 }),
                disabled: draft.trim() === "",
                onClick: () => {
                  submitNew();
                },
                children: t("add")
              }
            )
          ]
        }
      )
    ] })
  ] });
}

// src/client/locales.ts
var zh = {
  // 下拉按钮
  "label": "\u7EE7\u7EED",
  "title": "\u9009\u62E9\u5E38\u7528\u6307\u4EE4\u5E76\u53D1\u9001",
  "dropdown.aria": "\u6253\u5F00\u5E38\u7528\u6307\u4EE4",
  "sendNow.title": "\u76F4\u63A5\u53D1\u9001\uFF1A{text}",
  "sendNow.aria": "\u76F4\u63A5\u53D1\u9001\uFF1A{text}",
  // 打开目录（既有能力）
  "openDirectory.title": "\u6253\u5F00\u5DE5\u4F5C\u533A\u76EE\u5F55",
  "openDirectory.aria": "\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00\u5DE5\u4F5C\u533A\u76EE\u5F55",
  // 设置页
  "nav": "\u5E38\u7528\u6307\u4EE4",
  "sectionTitle": "\u5E38\u7528\u6307\u4EE4",
  "sectionIntro": "\u81EA\u5B9A\u4E49\u5E38\u7528\u6307\u4EE4\uFF0C\u5728\u8F93\u5165\u6846\u5DE6\u4FA7\u7684\u300C\u7EE7\u7EED\u300D\u4E0B\u62C9\u4E2D\u9009\u62E9\u5E76\u53D1\u9001\u3002",
  "builtinGroup": "\u9ED8\u8BA4\u6307\u4EE4",
  "builtinBadge": "\u5185\u7F6E",
  "builtinHint": "\u9ED8\u8BA4\u6307\u4EE4\u4E0D\u53EF\u4FEE\u6539\u6216\u5220\u9664",
  "customGroup": "\u81EA\u5B9A\u4E49\u6307\u4EE4",
  "customEmpty": "\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6307\u4EE4\uFF0C\u5728\u4E0B\u65B9\u65B0\u5EFA\u4E00\u6761\u3002",
  "add": "\u6DFB\u52A0",
  "addPlaceholder": "\u8F93\u5165\u6307\u4EE4\u77ED\u8BED",
  "editAria": "\u7F16\u8F91\u6307\u4EE4",
  "deleteAria": "\u5220\u9664\u6307\u4EE4",
  "save": "\u4FDD\u5B58",
  "cancel": "\u53D6\u6D88"
};
var en = {
  // Dropdown button
  "label": "Continue",
  "title": "Choose a common instruction to send",
  "dropdown.aria": "Open common instructions",
  "sendNow.title": "Send now: {text}",
  "sendNow.aria": "Send now: {text}",
  // Open directory (existing capability)
  "openDirectory.title": "Open workspace directory",
  "openDirectory.aria": "Open workspace directory in file explorer",
  // Settings section
  "nav": "Common instructions",
  "sectionTitle": "Common instructions",
  "sectionIntro": 'Customize common instructions and pick one from the "Continue" dropdown on the left of the composer.',
  "builtinGroup": "Default instruction",
  "builtinBadge": "Built-in",
  "builtinHint": "The default instruction cannot be edited or removed",
  "customGroup": "Custom instructions",
  "customEmpty": "No custom instructions yet. Create one below.",
  "add": "Add",
  "addPlaceholder": "Type an instruction phrase",
  "editAria": "Edit instruction",
  "deleteAria": "Delete instruction",
  "save": "Save",
  "cancel": "Cancel"
};

// src/client/index.ts
var NS = "continue";
var CSS_TAG_ID = "dsh-plugin-continue/continue.css";
var CSS_TEXT = [
  // 继续下拉触发按钮
  ".dsh-continue-action{height:28px;padding:0 8px;border:none;border-radius:8px;",
  "background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;",
  "font-weight:500;line-height:20px;white-space:nowrap;cursor:pointer;",
  "display:inline-flex;align-items:center;gap:2px}",
  ".dsh-continue-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);",
  "color:var(--dsw-alias-label-primary)}",
  ".dsh-continue-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);",
  "outline-offset:2px}",
  ".dsh-continue-action:disabled{opacity:.5;cursor:default}",
  ".dsh-continue-chevron{display:inline-flex;color:inherit;opacity:.7}",
  // 拆分按钮：左半文字点一下直接发送，右半箭头展开常用指令菜单
  ".dsh-continue-split{display:inline-flex;align-items:stretch}",
  ".dsh-continue-label{border-radius:8px 0 0 8px;padding:0 6px 0 8px}",
  ".dsh-continue-caret{border-radius:0 8px 8px 0;padding:0 4px;",
  "border-left:1px solid var(--dsw-alias-border-l2)}",
  // 打开目录按钮
  ".dsh-continue-icon-action{display:inline-flex;align-items:center;justify-content:center;",
  "width:28px;height:28px;padding:0;border:none;border-radius:8px;background:transparent;",
  "color:var(--dsw-alias-label-secondary);cursor:pointer}",
  ".dsh-continue-icon-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);",
  "color:var(--dsw-alias-label-primary)}",
  ".dsh-continue-icon-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);",
  "outline-offset:2px}",
  ".dsh-continue-icon-action:disabled{opacity:.5;cursor:default}",
  // 常用指令设置页
  ".dsh-instructions-section{display:flex;flex-direction:column;gap:8px;max-width:560px}",
  ".dsh-instructions-title{margin:0;font-size:16px;font-weight:600;line-height:24px;",
  "color:var(--dsw-alias-label-primary)}",
  ".dsh-instructions-intro{margin:0;font-size:13px;line-height:20px;",
  "color:var(--dsw-alias-label-secondary)}",
  ".dsh-instruction-group{display:flex;flex-direction:column;gap:8px;margin-top:8px}",
  ".dsh-instruction-group-head{margin:0;font-size:13px;font-weight:600;line-height:20px;",
  "color:var(--dsw-alias-label-primary)}",
  ".dsh-instruction-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}",
  ".dsh-instruction-row{display:flex;align-items:center;gap:8px;min-height:36px;padding:6px 10px;",
  "border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;",
  "background:var(--dsw-alias-bg-layer-1)}",
  ".dsh-instruction-row-builtin{background:transparent}",
  ".dsh-instruction-row-editing{background:transparent;padding-right:6px}",
  ".dsh-instruction-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",
  "font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}",
  ".dsh-instruction-badge{flex:none;padding:0 6px;border:0.5px solid var(--dsw-alias-border-l2);",
  "border-radius:6px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
  ".dsh-instruction-hint{flex:none;font-size:11px;line-height:16px;",
  "color:var(--dsw-alias-label-secondary)}",
  ".dsh-instruction-empty{margin:0;font-size:13px;line-height:20px;",
  "color:var(--dsw-alias-label-secondary)}",
  ".dsh-instruction-new{display:flex;align-items:center;gap:8px}",
  ".dsh-instruction-input{flex:1;min-width:0}"
].join("");
function installStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_TAG_ID)}]`) !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-plugin-continue";
  tag.dataset.pluginCss = CSS_TAG_ID;
  tag.textContent = CSS_TEXT;
  document.head.appendChild(tag);
}
installStyle();
var inject = ["slots", "locale", "sessions", "remote", "remote.session"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-plugin-continue: dictionaries");
  const remote = ctx;
  const sessions = ctx.sessions;
  const instructions = new InstructionsController();
  const openDirectory = (path) => {
    remote.remote.session.openWorkspacePath({ path }).then((result) => {
      if (!result.ok) console.warn(`dsh-plugin-continue: \u6253\u5F00\u76EE\u5F55\u5931\u8D25: ${result.error.message}`);
    }).catch((error) => {
      console.warn("dsh-plugin-continue: \u6253\u5F00\u76EE\u5F55\u5931\u8D25:", error);
    });
  };
  ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
    name: "conversation.input.left",
    id: "continue",
    order: 0,
    locale: NS,
    inject: (sessionId) => ({
      openDirectory,
      cwd: sessions.list.getSnapshot().byId[sessionId]?.cwd,
      hooks: { instructions: instructions.store }
    })
  }, ContinueAction));
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "common-instructions",
    order: 30,
    label: () => ctx.locale.bind(NS)("nav"),
    locale: NS,
    inject: () => ({
      add: (text) => {
        instructions.add(text);
      },
      update: (id, text) => {
        instructions.update(id, text);
      },
      remove: (id) => {
        instructions.remove(id);
      },
      hooks: { instructions: instructions.store }
    })
  }, InstructionsSection));
}
return module.exports; } });
