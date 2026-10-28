window.__ModuleLoader__.load({
  id: "dsh-easytier",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");

    /** Shorthand for React.createElement (this module ships unbuilt). */
    const h = react.createElement;

    /** Locale namespace and the panel id shared with the sidebar entry. */
    const NS = "dsh-easytier";
    const PANEL_ID = "easytier";

    const API = "/api/dsh-easytier";

    // #region styles
    const CSS = [
      ".et-panel{display:flex;flex-direction:column;gap:10px;height:100%;min-height:0;min-width:0;padding:14px 16px 16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}",
      ".et-header{display:flex;align-items:center;gap:10px;flex:none}",
      ".et-title{flex:1;margin:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".et-badge{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:1px 8px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:nowrap}",
      ".et-badge[data-state=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".et-badge[data-state=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".et-badge[data-state=err]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".et-tabs{display:flex;gap:2px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1);overflow-x:auto}",
      ".et-tab{background:none;border:none;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;padding:7px 14px;font-size:13px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}",
      ".et-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".et-tab[data-active]{border-bottom-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary);font-weight:600}",
      ".et-body{display:flex;flex:1;flex-direction:column;gap:10px;min-height:0;overflow-y:auto}",
      ".et-toolbar{display:flex;flex:none;flex-wrap:wrap;align-items:center;gap:8px}",
      ".et-spacer{flex:1}",
      ".et-input,.et-select{background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:13px;color:var(--dsw-alias-label-primary);outline:none}",
      ".et-input:focus,.et-select:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".et-input::placeholder{color:var(--dsw-alias-label-tertiary)}",
      ".et-btn{background:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 12px;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap}",
      ".et-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".et-btn:disabled{opacity:.45;cursor:default}",
      ".et-btn[data-primary]{background:var(--dsw-alias-button-info-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground);font-weight:600}",
      ".et-btn[data-primary]:hover:not(:disabled){background:var(--dsw-alias-button-info-hover)}",
      ".et-btn[data-danger]{color:var(--dsw-alias-state-error-primary)}",
      ".et-tableWrap{flex:none;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:auto}",
      ".et-table{border-collapse:collapse;width:100%;font-size:12.5px}",
      ".et-table th{position:sticky;top:0;z-index:1;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:600;text-align:left;white-space:nowrap}",
      ".et-table td{padding:7px 10px;border-bottom:1px solid var(--dsw-alias-separator-primary);vertical-align:middle}",
      ".et-table tbody tr:last-child td{border-bottom:none}",
      ".et-table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}",
      ".et-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".et-muted{color:var(--dsw-alias-label-tertiary)}",
      ".et-empty{padding:28px 12px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:1.6}",
      ".et-card{display:flex;flex:none;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}",
      ".et-cardTitle{margin:0;font-size:13px;font-weight:600}",
      ".et-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px 14px}",
      ".et-kv{display:flex;flex-direction:column;gap:2px;min-width:0}",
      ".et-kvKey{font-size:11.5px;color:var(--dsw-alias-label-tertiary)}",
      ".et-kvVal{font-size:12.5px;overflow-wrap:anywhere}",
      ".et-field{display:flex;flex-direction:column;gap:4px}",
      ".et-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
      ".et-hint{font-size:11.5px;color:var(--dsw-alias-label-tertiary);line-height:1.5}",
      ".et-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}",
      ".et-actions{display:flex;align-items:center;gap:8px;white-space:nowrap}",
      ".et-notice{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 12px;font-size:12.5px;line-height:1.5;overflow-wrap:anywhere}",
      ".et-notice[data-kind=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}",
      ".et-notice[data-kind=error]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
      ".et-notice[data-kind=info]{color:var(--dsw-alias-label-secondary)}",
      ".et-check{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer}",
      ".et-secret{padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}",
      ".et-spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--dsw-alias-state-business-primary);border-top-color:transparent;border-radius:50%;vertical-align:-1px;animation:et-spin .8s linear infinite}",
      "@keyframes et-spin{to{transform:rotate(360deg)}}",
      ".et-link{background:none;border:none;padding:0;font-family:inherit;font-size:12px;color:var(--dsw-alias-state-business-primary);cursor:pointer}",
      ".et-link:hover{text-decoration:underline}",
      ".et-link[data-danger]{color:var(--dsw-alias-state-error-primary)}",
      ".et-link:disabled{opacity:.45;cursor:default}",
      ".et-probe{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}",
      ".et-probe[data-ok=true]{color:var(--dsw-alias-state-success-primary)}",
      ".et-probe[data-ok=false]{color:var(--dsw-alias-state-error-primary)}",
      ".et-editor{display:flex;flex:1;flex-direction:column;gap:8px;min-height:0}",
      ".et-textarea{width:100%;min-height:320px;flex:1;resize:vertical;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.55;outline:none;white-space:pre;overflow:auto;tab-size:2}",
      ".et-textarea:focus{border-color:var(--dsw-alias-state-business-primary)}",
      ".et-textarea:disabled{opacity:.6}",
      ".et-meta{font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}",
      ".et-backups{font-size:11.5px;color:var(--dsw-alias-label-tertiary);line-height:1.6;overflow-wrap:anywhere}",
    ].join("");

    /** Install the stylesheet once and return its disposer. */
    function installStyles() {
      const tagId = "dsh-easytier/panel.css";
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
      "entry.label": "EasyTier",
      "panel.title": "EasyTier 组网",
      "panel.back": "返回对话",
      "common.loading": "加载中…",
      "common.refresh": "刷新",
      "common.cancel": "取消",
      "common.add": "添加",
      "common.remove": "删除",
      "common.copy": "复制",
      "common.copied": "已复制",
      "common.search": "搜索主机名或 IP",
      "common.none": "无",
      "tab.terminals": "终端",
      "tab.forwards": "端口转发",
      "tab.whitelist": "白名单",
      "tab.credentials": "临时凭证",
      "tab.connectors": "连接管理",
      "tab.status": "状态",
      "tab.config": "配置",
      "config.title": "配置文件",
      "config.path": "路径",
      "config.meta": "大小 / 修改时间",
      "config.writable": "可写",
      "config.readonly": "只读",
      "config.reload": "重新加载",
      "config.revert": "还原修改",
      "config.save": "保存",
      "config.saved": "已保存",
      "config.restarted": "服务已重启",
      "config.dirty": "有未保存的修改",
      "config.unmodified": "无修改",
      "config.secretWarning": "此文件包含 network_secret（网络密钥），请勿外传或提交仓库。",
      "config.restartHint": "保存后需要重启 EasyTier 服务才会生效。",
      "config.restartNow": "重启服务",
      "config.backup": "已备份到",
      "config.backups": "已有备份",
      "config.readonlyHint": "当前账户对该文件没有写权限，保存已禁用。",
      "config.empty": "配置文件内容为空。",
      "config.staleHost": "宿主端仍在运行旧版本（Host 端 JS 模块已缓存）：重启 dsh（结束当前 dsh web 进程后重新运行）即可启用此页。",
      "instance.online": "在线",
      "instance.offline": "未连通",
      "instance.select": "实例",
      "instance.none": "未发现运行中的 EasyTier",
      "instance.noneHint": "本机没有找到 easytier-core 进程。请确认 EasyTier 服务或 GUI 已经启动，然后点击刷新。",
      "instance.cliMissing": "已找到 easytier-core，但没有定位到 easytier-cli。可在插件配置里设置 cliPath。",
      "terminal.hostname": "主机名",
      "terminal.ip": "虚拟 IP",
      "terminal.link": "连接",
      "terminal.latency": "延迟",
      "terminal.loss": "丢包",
      "terminal.tunnel": "隧道",
      "terminal.traffic": "收发",
      "terminal.nextHop": "下一跳",
      "terminal.proxy": "代理网段",
      "terminal.version": "版本",
      "terminal.actions": "操作",
      "terminal.probe": "探测",
      "terminal.forward": "转发",
      "terminal.empty": "当前网络中没有终端。",
      "terminal.count": "个终端",
      "probe.port": "探测端口",
      "probe.portHint": "可选：填写端口后探测会同时做 TCP 连通测试",
      "probe.icmp": "ICMP",
      "probe.tcp": "TCP",
      "probe.reachable": "可达",
      "probe.unreachable": "不可达",
      "forwards.title": "把终端上的服务映射到本机",
      "forwards.protocol": "协议",
      "forwards.bind": "本机监听",
      "forwards.dst": "终端目标",
      "forwards.add": "添加规则",
      "forwards.empty": "还没有端口转发规则。",
      "forwards.hint": "例：tcp 0.0.0.0:8080 → 10.126.126.3:80，之后访问本机 8080 即到达该终端的 80 端口。",
      "forwards.expose": "映射本机端口",
      "whitelist.tcp": "TCP 端口白名单",
      "whitelist.udp": "UDP 端口白名单",
      "whitelist.none": "未设置（不限端口）",
      "whitelist.apply": "应用",
      "whitelist.clear": "清空",
      "whitelist.hint": "限制本节点经 EasyTier 对外开放的端口；留空并点应用即清除限制。",
      "credentials.title": "为新终端签发临时凭证",
      "credentials.id": "凭证 ID",
      "credentials.idHint": "可选，留空由 EasyTier 生成",
      "credentials.ttl": "有效期（秒）",
      "credentials.groups": "ACL 组",
      "credentials.groupsHint": "可选，逗号分隔",
      "credentials.relay": "允许中转",
      "credentials.reusable": "可复用",
      "credentials.generate": "生成凭证",
      "credentials.revoke": "吊销",
      "credentials.expires": "到期",
      "credentials.empty": "没有生效中的临时凭证。",
      "credentials.secretTitle": "凭证已生成（密钥只显示这一次）",
      "credentials.secretHint": "在新终端上使用：easytier-core --secure-mode --credential <密钥> -p <节点地址>",
      "connectors.title": "出站对端连接",
      "connectors.url": "对端地址",
      "connectors.urlHint": "例：tcp://1.2.3.4:11010",
      "connectors.add": "添加连接",
      "connectors.remove": "断开",
      "connectors.empty": "没有 connector 记录。",
      "connectors.hint": "connector 表示本节点主动拨号的服务器地址；删除会断开该出站连接。",
      "status.node": "节点",
      "status.network": "网络",
      "status.listeners": "监听端口",
      "status.portProtocol": "协议",
      "status.portAddress": "监听地址",
      "status.portNumber": "端口",
      "status.portScope": "可见范围",
      "status.portPurpose": "作用",
      "status.portEmpty": "没有可解析的监听端口。",
      "status.portFootnote": "0.0.0.0 / [::] 表示对所有网卡开放（同网段或公网可达），127.0.0.1 表示仅本机；端口与协议来自 EasyTier 的 listeners 配置与 RPC 门户。",
      "port.role.listener": "P2P 传输监听：与其它终端建立隧道、NAT 打洞",
      "port.role.rpc": "RPC 管理门户：easytier-cli 与 GUI 通过它管理本实例，建议只对可信网络开放",
      "port.role.ring": "进程内实例通道（EasyTier 内部 ring 传输），不占用网络端口",
      "port.role.vpn": "WireGuard VPN 门户：外部客户端经它接入此节点所在网段",
      "port.scope.all4": "所有 IPv4 网卡",
      "port.scope.all6": "所有 IPv6 网卡",
      "port.scope.loopback": "仅本机",
      "port.scope.other": "指定地址",
      "port.scope.process": "进程内",
      "status.publicIp": "公网地址",
      "status.nat": "NAT 类型",
      "status.proxy": "代理网段",
      "status.service": "系统服务",
      "status.start": "启动",
      "status.stop": "停止",
      "status.restart": "重启",
      "status.vpn": "WireGuard 门户",
      "status.acl": "ACL",
      "status.topology": "全局拓扑",
      "status.elevate": "启停系统服务需要管理员权限；普通会话会返回 Access denied。",
      "status.notService": "该实例不是以系统服务方式启动的，无法在此启停。",
      "status.config": "配置文件",
      "status.portal": "RPC 门户",
      "status.pid": "进程 PID",
      "status.cli": "CLI",
      "status.started": "已启动",
      "status.stopped": "未启动",
    };

    const en = {
      "entry.label": "EasyTier",
      "panel.title": "EasyTier Network",
      "panel.back": "Back to conversation",
      "common.loading": "Loading…",
      "common.refresh": "Refresh",
      "common.cancel": "Cancel",
      "common.add": "Add",
      "common.remove": "Remove",
      "common.copy": "Copy",
      "common.copied": "Copied",
      "common.search": "Search hostname or IP",
      "common.none": "none",
      "tab.terminals": "Terminals",
      "tab.forwards": "Port forward",
      "tab.whitelist": "Whitelist",
      "tab.credentials": "Credentials",
      "tab.connectors": "Connectors",
      "tab.status": "Status",
      "tab.config": "Config",
      "config.title": "Config file",
      "config.path": "Path",
      "config.meta": "Size / modified",
      "config.writable": "writable",
      "config.readonly": "read-only",
      "config.reload": "Reload",
      "config.revert": "Revert changes",
      "config.save": "Save",
      "config.saved": "Saved",
      "config.restarted": "Service restarted",
      "config.dirty": "unsaved changes",
      "config.unmodified": "no changes",
      "config.secretWarning": "This file contains network_secret (the shared network key). Do not share it or commit it.",
      "config.restartHint": "Restart the EasyTier service for the change to take effect.",
      "config.restartNow": "Restart service",
      "config.backup": "Backed up to",
      "config.backups": "Existing backups",
      "config.readonlyHint": "The current account cannot write this file, so saving is disabled.",
      "config.empty": "The config file is empty.",
      "config.staleHost": "The host side is still running the previous version (its JS module is cached): restart dsh (stop the current dsh web process and run it again) to enable this tab.",
      "instance.online": "online",
      "instance.offline": "unreachable",
      "instance.select": "Instance",
      "instance.none": "No running EasyTier found",
      "instance.noneHint": "No easytier-core process was found. Start the EasyTier service or GUI, then refresh.",
      "instance.cliMissing": "easytier-core was found but easytier-cli was not located. Set cliPath in the plugin config.",
      "terminal.hostname": "Hostname",
      "terminal.ip": "Virtual IP",
      "terminal.link": "Link",
      "terminal.latency": "Latency",
      "terminal.loss": "Loss",
      "terminal.tunnel": "Tunnel",
      "terminal.traffic": "RX/TX",
      "terminal.nextHop": "Next hop",
      "terminal.proxy": "Proxy CIDRs",
      "terminal.version": "Version",
      "terminal.actions": "Actions",
      "terminal.probe": "Probe",
      "terminal.forward": "Forward",
      "terminal.empty": "The current network has no terminals.",
      "terminal.count": "terminal(s)",
      "probe.port": "Probe port",
      "probe.portHint": "Optional: with a port, the probe also runs a TCP connect test",
      "probe.icmp": "ICMP",
      "probe.tcp": "TCP",
      "probe.reachable": "reachable",
      "probe.unreachable": "unreachable",
      "forwards.title": "Expose a service on a terminal through this machine",
      "forwards.protocol": "Protocol",
      "forwards.bind": "Local bind",
      "forwards.dst": "Terminal target",
      "forwards.add": "Add rule",
      "forwards.empty": "No port-forward rules yet.",
      "forwards.hint": "e.g. tcp 0.0.0.0:8080 → 10.126.126.3:80: connecting to local 8080 reaches port 80 on that terminal.",
      "forwards.expose": "Map a local port",
      "whitelist.tcp": "TCP port whitelist",
      "whitelist.udp": "UDP port whitelist",
      "whitelist.none": "not set (all ports allowed)",
      "whitelist.apply": "Apply",
      "whitelist.clear": "Clear",
      "whitelist.hint": "Restricts the ports this node serves over EasyTier. Apply an empty list to remove the restriction.",
      "credentials.title": "Issue a temporary credential for a new terminal",
      "credentials.id": "Credential ID",
      "credentials.idHint": "Optional; EasyTier generates one when empty",
      "credentials.ttl": "TTL (seconds)",
      "credentials.groups": "ACL groups",
      "credentials.groupsHint": "Optional, comma separated",
      "credentials.relay": "Allow relay",
      "credentials.reusable": "Reusable",
      "credentials.generate": "Generate",
      "credentials.revoke": "Revoke",
      "credentials.expires": "Expires",
      "credentials.empty": "No active temporary credentials.",
      "credentials.secretTitle": "Credential generated (the secret is shown once)",
      "credentials.secretHint": "On the new terminal: easytier-core --secure-mode --credential <secret> -p <node-url>",
      "connectors.title": "Outbound peer connections",
      "connectors.url": "Peer URL",
      "connectors.urlHint": "e.g. tcp://1.2.3.4:11010",
      "connectors.add": "Add connector",
      "connectors.remove": "Disconnect",
      "connectors.empty": "No connectors.",
      "connectors.hint": "A connector is a server this node dials. Removing it drops that outbound connection.",
      "status.node": "Node",
      "status.network": "Network",
      "status.listeners": "Listening ports",
      "status.portProtocol": "Protocol",
      "status.portAddress": "Bind address",
      "status.portNumber": "Port",
      "status.portScope": "Reach",
      "status.portPurpose": "Purpose",
      "status.portEmpty": "No parseable listening ports.",
      "status.portFootnote": "0.0.0.0 / [::] means every interface (reachable on the LAN or the internet); 127.0.0.1 means this machine only. Ports and protocols come from the EasyTier listeners config and the RPC portal.",
      "port.role.listener": "P2P transport listener: opens tunnels to other terminals and performs NAT traversal",
      "port.role.rpc": "RPC management portal: easytier-cli and the GUI manage this instance through it; keep it trusted-network only",
      "port.role.ring": "In-process instance channel (EasyTier ring transport); consumes no network port",
      "port.role.vpn": "WireGuard VPN portal: external clients reach this node's subnet through it",
      "port.scope.all4": "all IPv4 interfaces",
      "port.scope.all6": "all IPv6 interfaces",
      "port.scope.loopback": "loopback only",
      "port.scope.other": "specific address",
      "port.scope.process": "in-process",
      "status.publicIp": "Public address",
      "status.nat": "NAT type",
      "status.proxy": "Proxy CIDRs",
      "status.service": "System service",
      "status.start": "Start",
      "status.stop": "Stop",
      "status.restart": "Restart",
      "status.vpn": "WireGuard portal",
      "status.acl": "ACL",
      "status.topology": "Global topology",
      "status.elevate": "Starting or stopping a system service needs an elevated session; an unelevated one reports Access denied.",
      "status.notService": "This instance was not started as a system service, so it cannot be controlled here.",
      "status.config": "Config file",
      "status.portal": "RPC portal",
      "status.pid": "Process PID",
      "status.cli": "CLI",
      "status.started": "started",
      "status.stopped": "not started",
    };
    // #endregion

    // #region api
    /** Error carrying the route's JSON error message. */
    class ApiError extends Error {
      constructor(message) {
        super(message);
        this.name = "EasytierApiError";
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

    /** The panel's only data entry point. */
    class EasytierApi {
      async request(path, method, body) {
        const init = { method: method || "GET" };
        if (body !== undefined) {
          init.headers = { "content-type": "application/json" };
          init.body = JSON.stringify(body);
        }
        return readJson(await fetch(API + path, init));
      }

      snapshot(force) {
        return this.request("/snapshot" + (force ? "?force=1" : ""));
      }

      terminals(instanceId) {
        return this.request("/terminals?instance=" + encodeURIComponent(instanceId || ""));
      }

      info(instanceId) {
        return this.request("/info?instance=" + encodeURIComponent(instanceId || ""));
      }

      portForwards(instanceId) {
        return this.request("/port-forwards?instance=" + encodeURIComponent(instanceId || ""));
      }

      addPortForward(body) {
        return this.request("/port-forwards", "POST", body);
      }

      removePortForward(body) {
        return this.request("/port-forwards", "DELETE", body);
      }

      whitelist(instanceId) {
        return this.request("/whitelist?instance=" + encodeURIComponent(instanceId || ""));
      }

      setWhitelist(body) {
        return this.request("/whitelist", "POST", body);
      }

      clearWhitelist(body) {
        return this.request("/whitelist", "DELETE", body);
      }

      credentials(instanceId) {
        return this.request("/credentials?instance=" + encodeURIComponent(instanceId || ""));
      }

      generateCredential(body) {
        return this.request("/credentials", "POST", body);
      }

      revokeCredential(body) {
        return this.request("/credentials", "DELETE", body);
      }

      connectors(instanceId) {
        return this.request("/connectors?instance=" + encodeURIComponent(instanceId || ""));
      }

      addConnector(body) {
        return this.request("/connectors", "POST", body);
      }

      removeConnector(body) {
        return this.request("/connectors", "DELETE", body);
      }

      probe(body) {
        return this.request("/probe", "POST", body);
      }

      serviceStatus(instanceId) {
        return this.request("/service?instance=" + encodeURIComponent(instanceId || ""));
      }

      serviceAction(body) {
        return this.request("/service", "POST", body);
      }

      config(instanceId) {
        return this.request("/config?instance=" + encodeURIComponent(instanceId || ""));
      }

      saveConfig(body) {
        return this.request("/config", "POST", body);
      }
    }
    // #endregion

    // #region helpers
    /** Run an async loader and re-run it on demand. */
    function useAsync(loader, deps) {
      const [state, setState] = react.useState({ loading: true, data: null, error: "" });
      const [tick, setTick] = react.useState(0);
      react.useEffect(() => {
        let alive = true;
        setState((prev) => ({ loading: true, data: prev.data, error: "" }));
        Promise.resolve()
          .then(loader)
          .then((data) => {
            if (alive) setState({ loading: false, data, error: "" });
          })
          .catch((error) => {
            if (alive) setState({ loading: false, data: null, error: error instanceof Error ? error.message : String(error) });
          });
        return () => {
          alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps.concat([tick]));
      return { loading: state.loading, data: state.data, error: state.error, reload: () => setTick((value) => value + 1) };
    }

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

    /** Format an epoch-seconds expiry as a local time. */
    function formatExpiry(unix) {
      if (typeof unix !== "number") return "-";
      const date = new Date(unix * 1000);
      return date.toLocaleString();
    }

    /** Render a labelled key/value pair. */
    function kv(label, value) {
      return h("div", { className: "et-kv", key: label },
        h("span", { className: "et-kvKey" }, label),
        h("span", { className: "et-kvVal" }, value === undefined || value === null || value === "" ? "-" : value));
    }

    /** Render an inline notice. */
    function notice(kind, text) {
      return h("div", { className: "et-notice", "data-kind": kind }, text);
    }

    /** Render a data table. */
    function dataTable(columns, rows, emptyText) {
      if (rows.length === 0) return h("div", { className: "et-empty" }, emptyText);
      return h("div", { className: "et-tableWrap" },
        h("table", { className: "et-table" },
          h("thead", null, h("tr", null, columns.map((column) => h("th", { key: column.key }, column.label)))),
          h("tbody", null, rows.map((row, index) => h("tr", { key: row.key === undefined ? index : row.key },
            columns.map((column) => h("td", { key: column.key }, column.render ? column.render(row) : (row[column.key] === undefined || row[column.key] === null || row[column.key] === "" ? "-" : row[column.key]))))))));
    }
    // #endregion

    // #region ports

    /** Parse an EasyTier listener URL (`tcp://0.0.0.0:11010`, `ring://<id>`). */
    function parseListenerUrl(value) {
      const text = String(value === undefined || value === null ? "" : value);
      const at = text.indexOf("://");
      const protocol = at < 0 ? "unknown" : text.slice(0, at).toLowerCase();
      const rest = at < 0 ? text : text.slice(at + 3);
      if (protocol === "ring") return { protocol: "ring", address: rest, port: null, role: "ring" };
      const match = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(rest);
      if (match === null) return { protocol, address: rest, port: null, role: "listener" };
      return { protocol, address: match[1], port: Number(match[2]), role: "listener" };
    }

    /** Split `host:port` (the RPC portal form) into its parts. */
    function splitHostPort(value) {
      const text = String(value === undefined || value === null ? "" : value);
      const match = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(text);
      if (match === null) return null;
      return { address: match[1], port: Number(match[2]) };
    }

    /** Human description of which interfaces a bind address exposes. */
    function addressScope(address, t) {
      if (address === "0.0.0.0") return t("port.scope.all4");
      if (address === "[::]" || address === "::") return t("port.scope.all6");
      if (address === "127.0.0.1" || address === "[::1]" || address === "::1") return t("port.scope.loopback");
      return t("port.scope.other");
    }

    /**
     * Build the local listening-port rows: EasyTier's own transport listeners,
     * the RPC portal the CLI/GUI drive, the WireGuard portal when it is up, and
     * the in-process ring channel.
     */
    function localPortRows(node, instance, vpnPortal, t) {
      const rows = [];
      const listeners = Array.isArray(node && node.listeners) ? node.listeners : [];
      for (const raw of listeners) {
        const parsed = parseListenerUrl(raw);
        if (parsed.role === "ring") {
          const shortId = parsed.address.length > 10 ? parsed.address.slice(0, 8) + "…" : parsed.address;
          rows.push({
            key: "ring:" + parsed.address,
            rank: 3,
            protocol: "ring",
            address: shortId,
            port: null,
            scope: t("port.scope.process"),
            purpose: t("port.role.ring"),
          });
          continue;
        }
        rows.push({
          key: parsed.protocol + ":" + parsed.address + ":" + String(parsed.port),
          rank: 0,
          protocol: parsed.protocol,
          address: parsed.address,
          port: parsed.port,
          scope: addressScope(parsed.address, t),
          purpose: t("port.role.listener"),
        });
      }

      const portal = splitHostPort(instance && instance.rpcPortal);
      if (portal !== null) {
        rows.push({
          key: "rpc:" + portal.address + ":" + portal.port,
          rank: 1,
          protocol: "tcp",
          address: portal.address,
          port: portal.port,
          scope: addressScope(portal.address, t),
          purpose: t("port.role.rpc"),
        });
      }

      if (vpnPortal !== null && vpnPortal !== undefined && vpnPortal.started === true) {
        const endpoint = /Endpoint\s*=\s*([^\s]+):(\d+)/.exec(String(vpnPortal.clientConfig || ""));
        if (endpoint !== null) {
          rows.push({
            key: "vpn:" + endpoint[2],
            rank: 2,
            protocol: "udp",
            address: endpoint[1],
            port: Number(endpoint[2]),
            scope: addressScope(endpoint[1], t),
            purpose: t("port.role.vpn"),
          });
        }
      }

      return rows.sort((a, b) => a.rank - b.rank || (a.port === null ? 0 : a.port) - (b.port === null ? 0 : b.port));
    }
    // #endregion

    // #region panel
    /** Sidebar glyph for the EasyTier panel entry. */
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
        h("path", { d: "M8 2.6 3 6.4l2 6.2h6l2-6.2z" }),
        h("circle", { cx: "8", cy: "2.6", r: "1.2" }),
        h("circle", { cx: "3", cy: "6.4", r: "1.2" }),
        h("circle", { cx: "13", cy: "6.4", r: "1.2" }),
        h("circle", { cx: "5", cy: "12.6", r: "1.2" }),
        h("circle", { cx: "11", cy: "12.6", r: "1.2" }));
    }

    /** Terminals tab: the network's terminals plus per-terminal probes. */
    function TerminalsTab(props) {
      const t = props.t;
      const instanceId = props.instanceId;
      const onNotice = props.onNotice;
      const forward = props.onForward;
      const state = useAsync(() => props.api.terminals(instanceId), [props.api, instanceId]);
      const [query, setQuery] = react.useState("");
      const [port, setPort] = react.useState("");
      const [probes, setProbes] = react.useState({});
      const [busy, setBusy] = react.useState("");

      const terminals = state.data && Array.isArray(state.data.terminals) ? state.data.terminals : [];
      const filtered = terminals.filter((entry) => {
        if (query.trim() === "") return true;
        const needle = query.trim().toLowerCase();
        return String(entry.hostname || "").toLowerCase().includes(needle) || String(entry.ipv4 || "").includes(needle);
      });

      const runProbe = async (entry) => {
        setBusy(entry.ipv4);
        setProbes((prev) => ({ ...prev, [entry.ipv4]: { running: true } }));
        try {
          const numeric = Number(port);
          const result = await props.api.probe({
            instanceId,
            target: entry.ipv4,
            ...(Number.isFinite(numeric) && numeric > 0 ? { port: numeric } : {}),
          });
          setProbes((prev) => ({ ...prev, [entry.ipv4]: { running: false, result } }));
        } catch (error) {
          setProbes((prev) => ({ ...prev, [entry.ipv4]: { running: false, error: error instanceof Error ? error.message : String(error) } }));
        } finally {
          setBusy("");
        }
      };

      const columns = [
        { key: "hostname", label: t("terminal.hostname"), render: (row) => h("span", null, row.hostname || "-", row.isLocal ? h("span", { className: "et-muted" }, " (local)") : null) },
        { key: "ipv4", label: t("terminal.ip"), render: (row) => h("span", { className: "et-mono" }, row.ipv4) },
        {
          key: "connection",
          label: t("terminal.link"),
          render: (row) => h("span", { className: "et-badge", "data-state": row.connection === "p2p" ? "ok" : row.isLocal ? undefined : "warn" }, row.isLocal ? "local" : row.connection),
        },
        { key: "latencyMs", label: t("terminal.latency"), render: (row) => (row.latencyMs === null ? "-" : row.latencyMs + " ms") },
        { key: "lossRate", label: t("terminal.loss"), render: (row) => (row.lossRate === null ? "-" : row.lossRate) },
        { key: "tunnelProto", label: t("terminal.tunnel") },
        { key: "traffic", label: t("terminal.traffic"), render: (row) => (row.rxBytes === null && row.txBytes === null ? "-" : (row.rxBytes || "-") + " / " + (row.txBytes || "-")) },
        { key: "nextHop", label: t("terminal.nextHop"), render: (row) => (row.isLocal ? "-" : row.nextHopHostname || row.nextHop || "-") },
        { key: "proxy", label: t("terminal.proxy"), render: (row) => (row.proxyCidrs.length === 0 ? "-" : row.proxyCidrs.join(", ")) },
        { key: "version", label: t("terminal.version"), render: (row) => h("span", { className: "et-mono et-muted" }, row.version || "-") },
        {
          key: "actions",
          label: t("terminal.actions"),
          render: (row) => {
            const probe = probes[row.ipv4];
            return h("div", { className: "et-actions" },
              h("button", {
                type: "button",
                className: "et-link",
                disabled: busy === row.ipv4,
                onClick: () => runProbe(row),
              }, busy === row.ipv4 ? h("span", { className: "et-spinner" }) : t("terminal.probe")),
              h("button", {
                type: "button",
                className: "et-link",
                onClick: () => forward(row),
              }, t("terminal.forward")),
              h("button", {
                type: "button",
                className: "et-link",
                onClick: async () => {
                  const ok = await copyText(row.ipv4);
                  onNotice(ok ? "ok" : "error", ok ? t("common.copied") + " " + row.ipv4 : row.ipv4);
                },
              }, t("common.copy")),
              probe === undefined ? null : (probe.running
                ? h("span", { className: "et-muted" }, h("span", { className: "et-spinner" }))
                : probe.error !== undefined
                  ? h("span", { className: "et-probe", "data-ok": "false" }, probe.error)
                  : h("span", { className: "et-probe", "data-ok": String(probe.result.reachable) }, describeProbe(probe.result, t))));
          },
        },
      ];

      return h("div", { className: "et-body" },
        h("div", { className: "et-toolbar" },
          h("input", {
            className: "et-input",
            style: { flex: "0 240px" },
            placeholder: t("common.search"),
            value: query,
            onChange: (event) => setQuery(event.target.value),
          }),
          h("input", {
            className: "et-input",
            style: { width: "120px" },
            placeholder: t("probe.port"),
            title: t("probe.portHint"),
            value: port,
            onChange: (event) => setPort(event.target.value.replace(/[^\d]/g, "")),
          }),
          h("span", { className: "et-hint" }, terminals.length + " " + t("terminal.count")),
          h("span", { className: "et-spacer" }),
          h("button", { type: "button", className: "et-btn", onClick: state.reload, disabled: state.loading }, t("common.refresh"))),
        state.error !== "" ? notice("error", state.error) : null,
        state.loading && state.data === null ? h("div", { className: "et-empty" }, t("common.loading")) : null,
        state.data !== null ? dataTable(columns, filtered, t("terminal.empty")) : null);
    }

    /** One-line probe summary. */
    function describeProbe(result, t) {
      const parts = [];
      const ping = result.ping || {};
      parts.push(t("probe.icmp") + " " + (ping.received === null || ping.received === undefined ? "?" : ping.received) + "/" + (ping.sent || "?"));
      if (ping.avgMs !== null && ping.avgMs !== undefined) parts.push(ping.avgMs + "ms");
      if (result.tcp !== null && result.tcp !== undefined) {
        parts.push(t("probe.tcp") + " " + (result.tcp.connected ? (result.tcp.latencyMs + "ms") : (result.tcp.error || "fail")));
      }
      parts.push(result.reachable ? t("probe.reachable") : t("probe.unreachable"));
      return parts.join(" · ");
    }

    /** Port-forward tab. */
    function ForwardsTab(props) {
      const t = props.t;
      const state = useAsync(() => props.api.portForwards(props.instanceId), [props.api, props.instanceId]);
      const [protocol, setProtocol] = react.useState("tcp");
      const [bind, setBind] = react.useState(props.defaultBind || "0.0.0.0:");
      const [dst, setDst] = react.useState(props.defaultDst || "");
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");

      react.useEffect(() => {
        if (props.defaultDst !== undefined && props.defaultDst !== "") setDst(props.defaultDst);
      }, [props.defaultDst]);

      const submit = async () => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.addPortForward({ instanceId: props.instanceId, protocol, bind, dst });
          props.onNotice("ok", result.message || "ok");
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const remove = async (rule) => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.removePortForward({ instanceId: props.instanceId, protocol: rule.protocol, bind: rule.bind, dst: rule.dst });
          props.onNotice("ok", result.message || "ok");
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const rules = state.data && Array.isArray(state.data.rules) ? state.data.rules : [];

      return h("div", { className: "et-body" },
        h("div", { className: "et-card" },
          h("h3", { className: "et-cardTitle" }, t("forwards.title")),
          h("div", { className: "et-row" },
            h("select", { className: "et-select", value: protocol, onChange: (event) => setProtocol(event.target.value) },
              h("option", { value: "tcp" }, "tcp"),
              h("option", { value: "udp" }, "udp")),
            h("input", { className: "et-input", style: { flex: "1 1 160px" }, placeholder: t("forwards.bind"), value: bind, onChange: (event) => setBind(event.target.value) }),
            h("span", { className: "et-muted" }, "→"),
            h("input", { className: "et-input", style: { flex: "1 1 160px" }, placeholder: t("forwards.dst"), value: dst, onChange: (event) => setDst(event.target.value) }),
            h("button", { type: "button", className: "et-btn", "data-primary": true, disabled: busy || bind === "" || dst === "", onClick: submit }, t("forwards.add"))),
          h("p", { className: "et-hint", style: { margin: 0 } }, t("forwards.hint")),
          error !== "" ? notice("error", error) : null),
        state.error !== "" ? notice("error", state.error) : null,
        dataTable([
          { key: "protocol", label: t("forwards.protocol") },
          { key: "bind", label: t("forwards.bind"), render: (row) => h("span", { className: "et-mono" }, row.bind) },
          { key: "dst", label: t("forwards.dst"), render: (row) => h("span", { className: "et-mono" }, row.dst) },
          {
            key: "actions",
            label: "",
            render: (row) => h("button", { type: "button", className: "et-link", "data-danger": true, disabled: busy, onClick: () => remove(row) }, t("common.remove")),
          },
        ], rules, t("forwards.empty")));
    }

    /** One whitelist editor. */
    function WhitelistCard(props) {
      const t = props.t;
      const [value, setValue] = react.useState((props.ports || []).join(","));
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");

      react.useEffect(() => {
        setValue((props.ports || []).join(","));
      }, [props.ports.join(",")]);

      const apply = async (ports) => {
        setBusy(true);
        setError("");
        try {
          const result = ports === ""
            ? await props.api.clearWhitelist({ instanceId: props.instanceId, kind: props.kind })
            : await props.api.setWhitelist({ instanceId: props.instanceId, kind: props.kind, ports });
          props.onNotice("ok", result.message || "ok");
          props.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      return h("div", { className: "et-card" },
        h("h3", { className: "et-cardTitle" }, props.title),
        h("div", { className: "et-hint" }, props.ports.length === 0 ? t("whitelist.none") : props.ports.join(", ")),
        h("div", { className: "et-row" },
          h("input", { className: "et-input", style: { flex: "1 1 200px" }, placeholder: "80,443,8000-9000", value: value, onChange: (event) => setValue(event.target.value) }),
          h("button", { type: "button", className: "et-btn", "data-primary": true, disabled: busy, onClick: () => apply(value.trim()) }, t("whitelist.apply")),
          h("button", { type: "button", className: "et-btn", disabled: busy, onClick: () => { setValue(""); apply(""); } }, t("whitelist.clear"))),
        error !== "" ? notice("error", error) : null);
    }

    /** Whitelist tab. */
    function WhitelistTab(props) {
      const t = props.t;
      const state = useAsync(() => props.api.whitelist(props.instanceId), [props.api, props.instanceId]);
      const whitelist = state.data && state.data.whitelist ? state.data.whitelist : { tcp: [], udp: [] };

      return h("div", { className: "et-body" },
        state.error !== "" ? notice("error", state.error) : null,
        h("p", { className: "et-hint", style: { margin: 0 } }, t("whitelist.hint")),
        h(WhitelistCard, { api: props.api, instanceId: props.instanceId, kind: "tcp", title: t("whitelist.tcp"), ports: whitelist.tcp, reload: state.reload, onNotice: props.onNotice, t }),
        h(WhitelistCard, { api: props.api, instanceId: props.instanceId, kind: "udp", title: t("whitelist.udp"), ports: whitelist.udp, reload: state.reload, onNotice: props.onNotice, t }));
    }

    /** Temporary credential tab. */
    function CredentialsTab(props) {
      const t = props.t;
      const state = useAsync(() => props.api.credentials(props.instanceId), [props.api, props.instanceId]);
      const [ttl, setTtl] = react.useState("3600");
      const [id, setId] = react.useState("");
      const [groups, setGroups] = react.useState("");
      const [allowRelay, setAllowRelay] = react.useState(false);
      const [reusable, setReusable] = react.useState(true);
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");
      const [issued, setIssued] = react.useState(null);

      const generate = async () => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.generateCredential({
            instanceId: props.instanceId,
            ttl: Number(ttl),
            ...(id.trim() !== "" ? { id: id.trim() } : {}),
            ...(groups.trim() !== "" ? { groups: groups.trim() } : {}),
            allowRelay,
            reusable,
          });
          setIssued(result);
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const revoke = async (credentialId) => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.revokeCredential({ instanceId: props.instanceId, id: credentialId });
          props.onNotice("ok", result.message || "ok");
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const credentials = state.data && Array.isArray(state.data.credentials) ? state.data.credentials : [];

      return h("div", { className: "et-body" },
        h("div", { className: "et-card" },
          h("h3", { className: "et-cardTitle" }, t("credentials.title")),
          h("div", { className: "et-row" },
            h("div", { className: "et-field" },
              h("span", { className: "et-label" }, t("credentials.ttl")),
              h("input", { className: "et-input", style: { width: "110px" }, value: ttl, onChange: (event) => setTtl(event.target.value.replace(/[^\d]/g, "")) })),
            h("div", { className: "et-field" },
              h("span", { className: "et-label" }, t("credentials.id")),
              h("input", { className: "et-input", style: { width: "190px" }, placeholder: t("credentials.idHint"), value: id, onChange: (event) => setId(event.target.value) })),
            h("div", { className: "et-field" },
              h("span", { className: "et-label" }, t("credentials.groups")),
              h("input", { className: "et-input", style: { width: "150px" }, placeholder: t("credentials.groupsHint"), value: groups, onChange: (event) => setGroups(event.target.value) })),
            h("label", { className: "et-check" }, h("input", { type: "checkbox", checked: allowRelay, onChange: (event) => setAllowRelay(event.target.checked) }), t("credentials.relay")),
            h("label", { className: "et-check" }, h("input", { type: "checkbox", checked: reusable, onChange: (event) => setReusable(event.target.checked) }), t("credentials.reusable")),
            h("button", { type: "button", className: "et-btn", "data-primary": true, disabled: busy || ttl === "", onClick: generate }, t("credentials.generate"))),
          error !== "" ? notice("error", error) : null,
          issued !== null
            ? h("div", { className: "et-field" },
              h("span", { className: "et-label" }, t("credentials.secretTitle")),
              h("div", { className: "et-secret" }, issued.secret || issued.raw || ""),
              h("div", { className: "et-row" },
                h("button", {
                  type: "button",
                  className: "et-btn",
                  onClick: async () => {
                    const ok = await copyText(issued.secret || "");
                    props.onNotice(ok ? "ok" : "error", ok ? t("common.copied") : "");
                  },
                }, t("common.copy")),
                h("span", { className: "et-hint" }, t("credentials.secretHint"))))
            : null),
        state.error !== "" ? notice("error", state.error) : null,
        dataTable([
          { key: "id", label: t("credentials.id"), render: (row) => h("span", { className: "et-mono" }, row.id) },
          { key: "groups", label: t("credentials.groups"), render: (row) => (row.groups.length === 0 ? "-" : row.groups.join(",")) },
          { key: "allowRelay", label: t("credentials.relay"), render: (row) => (row.allowRelay ? "yes" : "no") },
          { key: "reusable", label: t("credentials.reusable"), render: (row) => (row.reusable ? "yes" : "no") },
          { key: "expiryUnix", label: t("credentials.expires"), render: (row) => formatExpiry(row.expiryUnix) },
          {
            key: "actions",
            label: "",
            render: (row) => h("button", { type: "button", className: "et-link", "data-danger": true, disabled: busy, onClick: () => revoke(row.id) }, t("credentials.revoke")),
          },
        ], credentials, t("credentials.empty")));
    }

    /** Connector tab. */
    function ConnectorsTab(props) {
      const t = props.t;
      const state = useAsync(() => props.api.connectors(props.instanceId), [props.api, props.instanceId]);
      const [url, setUrl] = react.useState("");
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");

      const add = async () => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.addConnector({ instanceId: props.instanceId, url });
          props.onNotice("ok", result.message || "ok");
          setUrl("");
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const remove = async (target) => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.removeConnector({ instanceId: props.instanceId, url: target });
          props.onNotice("ok", result.message || "ok");
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const connectors = state.data && Array.isArray(state.data.connectors) ? state.data.connectors : [];

      return h("div", { className: "et-body" },
        h("div", { className: "et-card" },
          h("h3", { className: "et-cardTitle" }, t("connectors.title")),
          h("div", { className: "et-row" },
            h("input", { className: "et-input", style: { flex: "1 1 240px" }, placeholder: t("connectors.urlHint"), value: url, onChange: (event) => setUrl(event.target.value) }),
            h("button", { type: "button", className: "et-btn", "data-primary": true, disabled: busy || url === "", onClick: add }, t("connectors.add"))),
          h("p", { className: "et-hint", style: { margin: 0 } }, t("connectors.hint")),
          error !== "" ? notice("error", error) : null),
        state.error !== "" ? notice("error", state.error) : null,
        dataTable([
          { key: "url", label: t("connectors.url"), render: (row) => h("span", { className: "et-mono" }, row.url) },
          { key: "state", label: t("terminal.link"), render: (row) => h("span", { className: "et-badge", "data-state": row.state === "connected" ? "ok" : "warn" }, row.state) },
          {
            key: "actions",
            label: "",
            render: (row) => h("button", { type: "button", className: "et-link", "data-danger": true, disabled: busy, onClick: () => remove(row.url) }, t("connectors.remove")),
          },
        ], connectors, t("connectors.empty")));
    }

    /** Status tab: identity, service control, topology. */
    function StatusTab(props) {
      const t = props.t;
      const state = useAsync(() => props.api.info(props.instanceId), [props.api, props.instanceId]);
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");
      const info = state.data;
      const node = info && info.node ? info.node : {};
      const service = info && info.service ? info.service : null;
      const canControl = service !== null && service.status !== "not-a-service";

      const act = async (action) => {
        setBusy(true);
        setError("");
        try {
          const result = await props.api.serviceAction({ instanceId: props.instanceId, action });
          const stateText = result.service ? "status=" + result.service.status : "";
          props.onNotice("ok", (result.message || action) + (stateText !== "" ? " · " + stateText : ""));
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      return h("div", { className: "et-body" },
        state.error !== "" ? notice("error", state.error) : null,
        state.loading && info === null ? h("div", { className: "et-empty" }, t("common.loading")) : null,
        info === null ? null : h(react.Fragment, null,
          h("div", { className: "et-card" },
            h("h3", { className: "et-cardTitle" }, t("status.node")),
            h("div", { className: "et-grid" },
              kv(t("terminal.hostname"), node.hostname),
              kv(t("terminal.ip"), node.ipv4),
              kv(t("status.pid"), info.instance.pid),
              kv(t("status.portal"), info.instance.rpcPortal),
              kv("Peer ID", node.peerId),
              kv(t("status.config"), info.instance.configPath),
              kv(t("status.cli"), info.instance.cliPath),
              kv(t("status.publicIp"), node.publicIps && node.publicIps.length ? node.publicIps.join(", ") : "-"),
              kv(t("status.nat"), (node.udpNatType || "-") + " / " + (node.tcpNatType || "-")),
              kv(t("status.proxy"), node.proxyCidrs && node.proxyCidrs.length ? node.proxyCidrs.join(", ") : "-"),
              kv(t("status.network"), info.instance.configSummary ? info.instance.configSummary.networkName : "-"))),
          h("div", { className: "et-card" },
            h("h3", { className: "et-cardTitle" }, t("status.listeners")),
            dataTable([
              { key: "protocol", label: t("status.portProtocol"), render: (row) => h("span", { className: "et-mono" }, row.protocol) },
              { key: "address", label: t("status.portAddress"), render: (row) => h("span", { className: "et-mono" }, row.address) },
              { key: "port", label: t("status.portNumber"), render: (row) => h("span", { className: "et-mono" }, row.port === null ? "—" : String(row.port)) },
              { key: "scope", label: t("status.portScope"), render: (row) => h("span", { className: "et-muted" }, row.scope) },
              { key: "purpose", label: t("status.portPurpose"), render: (row) => row.purpose },
            ], localPortRows(node, info.instance, info.vpnPortal, t), t("status.portEmpty")),
            h("p", { className: "et-hint", style: { margin: 0 } }, t("status.portFootnote"))),
          h("div", { className: "et-card" },
            h("h3", { className: "et-cardTitle" }, t("status.service")),
            h("div", { className: "et-row" },
              h("span", { className: "et-badge", "data-state": service && service.status === "Running" ? "ok" : "warn" },
                (service && service.name ? service.name + ": " : "") + (service ? service.status : "-") + (service && service.startMode ? " · " + service.startMode : "")),
              h("span", { className: "et-spacer" }),
              h("button", { type: "button", className: "et-btn", disabled: busy || !canControl, onClick: () => act("start") }, t("status.start")),
              h("button", { type: "button", className: "et-btn", disabled: busy || !canControl, onClick: () => act("stop") }, t("status.stop")),
              h("button", { type: "button", className: "et-btn", disabled: busy || !canControl, onClick: () => act("restart") }, t("status.restart"))),
            canControl ? h("p", { className: "et-hint", style: { margin: 0 } }, t("status.elevate")) : h("p", { className: "et-hint", style: { margin: 0 } }, t("status.notService")),
            error !== "" ? notice("error", error) : null),
          h("div", { className: "et-card" },
            h("h3", { className: "et-cardTitle" }, t("status.vpn") + " · " + t("status.acl")),
            h("div", { className: "et-grid" },
              kv(t("status.vpn"), info.vpnPortal === null ? "-" : info.vpnPortal.vpnType + " · " + (info.vpnPortal.started ? t("status.started") : t("status.stopped"))),
              kv(t("status.acl"), info.acl === null ? "-" : "rules=" + info.acl.ruleCount + " conns=" + info.acl.connectionCount))),
          info.peerCenter.length === 0 ? null : h("div", { className: "et-card" },
            h("h3", { className: "et-cardTitle" }, t("status.topology")),
            h("div", { className: "et-grid" }, info.peerCenter.map((entry) => kv(
              (entry.hostname || entry.nodeId) + (entry.ipv4 ? " · " + entry.ipv4 : ""),
              entry.peers.length === 0 ? "-" : entry.peers.map((peer) => (peer.hostname || peer.nodeId) + (peer.latencyMs === null ? "" : " (" + peer.latencyMs + "ms)")).join(", "),
            ))))));
    }

    /** Config tab: view and edit the config file the instance was started with. */
    function ConfigTab(props) {
      const t = props.t;
      const api = props.api;
      const instanceId = props.instanceId;
      const state = useAsync(() => api.config(instanceId), [api, instanceId]);
      const [draft, setDraft] = react.useState(null);
      const [busy, setBusy] = react.useState(false);
      const [error, setError] = react.useState("");
      const [saved, setSaved] = react.useState(null);

      const data = state.data;
      const loaded = data && typeof data.content === "string" ? data.content : null;
      const value = draft === null ? (loaded === null ? "" : loaded) : draft;
      const dirty = loaded !== null && value !== loaded;
      const writable = data !== null && data.writable === true;
      const canSave = writable && dirty && !busy && value.trim() !== "";

      const save = async () => {
        setBusy(true);
        setError("");
        setSaved(null);
        try {
          const result = await api.saveConfig({ instanceId, content: value });
          setSaved(result);
          setDraft(null);
          props.onNotice("ok", t("config.saved"));
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      const restart = async () => {
        setBusy(true);
        setError("");
        try {
          await api.serviceAction({ instanceId, action: "restart" });
          props.onNotice("ok", t("config.restarted"));
          state.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      };

      if (state.error !== "") {
        const stale = /no such endpoint|HTTP 404/i.test(state.error);
        return h("div", { className: "et-body" },
          notice("error", state.error),
          stale ? notice("info", t("config.staleHost")) : null);
      }
      if (state.loading && data === null) {
        return h("div", { className: "et-empty" }, t("common.loading"));
      }
      if (data === null) return null;

      return h("div", { className: "et-body" },
        h("div", { className: "et-card" },
          h("h3", { className: "et-cardTitle" }, t("config.title")),
          h("div", { className: "et-meta et-mono" }, data.path),
          h("div", { className: "et-row" },
            h("span", { className: "et-badge", "data-state": writable ? "ok" : "warn" }, writable ? t("config.writable") : t("config.readonly")),
            h("span", { className: "et-badge", "data-state": dirty ? "warn" : undefined }, dirty ? t("config.dirty") : t("config.unmodified")),
            h("span", { className: "et-meta" },
              (typeof data.size === "number" ? data.size + " B" : "-")
              + " · " + (typeof data.mtimeMs === "number" ? new Date(data.mtimeMs).toLocaleString() : "-")),
            h("span", { className: "et-spacer" }),
            h("button", { type: "button", className: "et-btn", disabled: busy, onClick: () => { setDraft(null); setSaved(null); setError(""); state.reload(); } }, t("config.reload")),
            h("button", { type: "button", className: "et-btn", disabled: busy || draft === null, onClick: () => { setDraft(null); setSaved(null); setError(""); } }, t("config.revert")),
            h("button", { type: "button", className: "et-btn", "data-primary": true, disabled: !canSave, onClick: save }, busy ? h("span", { className: "et-spinner" }) : t("config.save"))),
          data.containsSecret === true ? h("p", { className: "et-hint", style: { margin: 0 } }, t("config.secretWarning")) : null,
          writable ? null : h("p", { className: "et-hint", style: { margin: 0 } }, t("config.readonlyHint")),
          data.backupFiles && data.backupFiles.length > 0
            ? h("div", { className: "et-backups" }, t("config.backups") + ": " + data.backupFiles.join(", "))
            : null,
          error !== "" ? notice("error", error) : null,
          saved !== null
            ? h("div", { className: "et-row" },
              h("span", { className: "et-meta" }, saved.backupPath ? t("config.backup") + " " + saved.backupPath : ""),
              saved.needsRestart === true ? h("span", { className: "et-hint" }, t("config.restartHint")) : null,
              saved.serviceName ? h("button", { type: "button", className: "et-btn", disabled: busy, onClick: restart }, t("config.restartNow")) : null)
            : null,
          (saved !== null && saved.warnings && saved.warnings.length > 0)
            ? h("div", { className: "et-hint" }, saved.warnings.join(" · "))
            : null),
        h("div", { className: "et-editor" },
          h("textarea", {
            className: "et-textarea",
            spellCheck: false,
            wrap: "off",
            value,
            disabled: state.loading,
            placeholder: t("config.empty"),
            onChange: (event) => setDraft(event.target.value),
          })));
    }

    /** The EasyTier panel: instance header, tabs, and tab content. */
    function Panel(props) {
      const t = props.t;
      const api = props.api;
      const [tab, setTab] = react.useState("terminals");
      const [activeId, setActiveId] = react.useState(null);
      const [noticeState, setNoticeState] = react.useState(null);
      const [forwardTarget, setForwardTarget] = react.useState(null);
      const snap = useAsync(() => api.snapshot(false), [api]);

      const instances = snap.data && Array.isArray(snap.data.instances) ? snap.data.instances : [];
      const active = instances.find((entry) => entry.id === activeId) || instances[0] || null;
      const activeKey = active === null ? "" : active.id;

      const onNotice = (kind, text) => setNoticeState({ kind, text });
      const forward = (terminal) => {
        setForwardTarget(terminal.ipv4 + ":");
        setTab("forwards");
      };

      const tabs = [
        { id: "terminals", label: t("tab.terminals") },
        { id: "forwards", label: t("tab.forwards") },
        { id: "whitelist", label: t("tab.whitelist") },
        { id: "credentials", label: t("tab.credentials") },
        { id: "connectors", label: t("tab.connectors") },
        { id: "status", label: t("tab.status") },
        { id: "config", label: t("tab.config") },
      ];

      const common = { api, instanceId: activeKey, t, onNotice };
      const content = active === null || snap.data === null
        ? null
        : tab === "terminals"
          ? h(TerminalsTab, { ...common, onForward: forward })
          : tab === "forwards"
            ? h(ForwardsTab, { ...common, defaultDst: forwardTarget || "" })
            : tab === "whitelist"
              ? h(WhitelistTab, common)
              : tab === "credentials"
                ? h(CredentialsTab, common)
                : tab === "connectors"
                  ? h(ConnectorsTab, common)
                  : tab === "config"
                    ? h(ConfigTab, common)
                    : h(StatusTab, common);

      const diagnostics = snap.data && snap.data.diagnostics ? snap.data.diagnostics : {};

      return h("div", { className: "et-panel" },
        h("div", { className: "et-header" },
          h("button", { type: "button", className: "et-btn", onClick: props.onBack, title: t("panel.back") }, "‹"),
          h("h2", { className: "et-title" }, t("panel.title")),
          active === null ? null : h("span", { className: "et-badge", "data-state": active.online ? "ok" : "err" }, active.online ? t("instance.online") : t("instance.offline")),
          active === null ? null : h("span", { className: "et-badge et-mono" }, active.hostname || active.ipv4 || active.id),
          h("button", { type: "button", className: "et-btn", disabled: snap.loading, onClick: snap.reload }, t("common.refresh"))),
        instances.length > 1
          ? h("div", { className: "et-toolbar" },
            h("span", { className: "et-label" }, t("instance.select")),
            h("select", { className: "et-select", value: activeKey, onChange: (event) => setActiveId(event.target.value) },
              instances.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.hostname || entry.id + " (pid " + entry.pid + ")"))))
          : null,
        noticeState === null ? null : h("div", { onClick: () => setNoticeState(null) }, notice(noticeState.kind, noticeState.text)),
        snap.error !== "" ? notice("error", snap.error) : null,
        snap.loading && snap.data === null ? h("div", { className: "et-empty" }, t("common.loading")) : null,
        snap.data !== null && instances.length === 0
          ? h("div", { className: "et-empty" },
            h("div", null, t("instance.none")),
            h("div", { style: { marginTop: "6px" } }, diagnostics.cliMissing === true ? t("instance.cliMissing") : t("instance.noneHint")))
          : null,
        instances.length === 0
          ? null
          : h(react.Fragment, null,
            h("div", { className: "et-tabs", role: "tablist" },
              tabs.map((entry) => h("button", {
                key: entry.id,
                type: "button",
                role: "tab",
                className: "et-tab",
                "data-active": tab === entry.id ? "" : undefined,
                "aria-selected": tab === entry.id,
                onClick: () => setTab(entry.id),
              }, entry.label))),
            content));
    }
    // #endregion

    /** Register the sidebar entry and the panel it opens. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-easytier: dictionaries");
      ctx.effect(() => installStyles(), "dsh-easytier: styles");
      const t = ctx.locale.bind(NS);
      const api = new EasytierApi();

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
        order: 11,
        label: () => t("entry.label"),
        locale: NS,
      }, SidebarGlyph));
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "layout"];
    return module.exports;
  },
});
