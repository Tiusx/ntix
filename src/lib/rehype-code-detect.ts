/**
 * rehype 插件：给没有语言标记的代码块**保守地**猜一个语言。
 *
 * 背景：Notion 导出的围栏里，111 个是裸围栏（```）、32 个写成 ```plain text，
 * 只有一半左右真的标了 shell / bash。这些块在 shiki 里全部落到 fallback，
 * 既不显示语言也不上色。
 *
 * 原则：宁可判不出来（留空、不着色），也不要猜错。注释里那些块用错语法着色
 * 比不着色更难看，所以每条规则都要求相当强的信号，并且按置信度从高到低匹配。
 *
 * 必须排在 rehype-shiki 之前：语言要在着色之前定下来，否则只能事后重排 DOM。
 */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** 明确表示「就是纯文本」的语言标记，这些才值得去猜。 */
const NO_LANGUAGE = new Set(["plain", "plaintext", "text", "txt", ""]);

/** 围栏 info 可能是 `plain text`、`shell {1,3}` 这类多词串，只取第一个词。 */
function firstWord(className: string): string {
  return className.replace(/^language-/, "").split(/[\s{]/)[0].toLowerCase();
}

/** 行首出现即认定为 shell 的命令。只收常见系统/运维命令，避免误判散文。 */
const SHELL_COMMANDS = [
  "sudo", "systemctl", "journalctl", "service", "docker", "docker-compose",
  "podman", "kubectl", "helm", "nginx", "mysql", "redis-cli", "psql",
  "curl", "wget", "ssh", "scp", "rsync", "rclone", "openssl", "ssh-keygen",
  "git", "pnpm", "npm", "yarn", "node", "python", "pip", "php", "composer",
  "cd", "ls", "pwd", "cat", "tail", "head", "grep", "sed", "awk", "find",
  "chmod", "chown", "mkdir", "rm", "cp", "mv", "tar", "unzip", "zip",
  "apt", "apt-get", "yum", "dnf", "rpm", "dpkg", "useradd", "passwd",
  "crontab", "iptables", "firewall-cmd", "netstat", "ss", "ping", "dig",
  "mount", "umount", "df", "du", "free", "ps", "kill", "top", "export",
  "source", "vim", "vi", "nano", "make", "go", "java", "mvn", "aws",
];

function classList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(classList);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

function isJson(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/** 按行首命令判断，要求至少两行命中，或者首行就是命令（单行片段）。 */
function looksLikeShell(code: string): boolean {
  const lines = code.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  if (lines[0].startsWith("#!")) return true;
  const isCommand = (line: string) => {
    const stripped = line.replace(/^[$#>]\s+/, "");
    const head = stripped.split(/[\s;|&]/)[0];
    return SHELL_COMMANDS.includes(head);
  };
  const hits = lines.filter(isCommand).length;
  if (lines.length === 1) return isCommand(lines[0]);
  return hits >= 2 && hits / lines.length >= 0.4;
}

function looksLikeNginx(code: string): boolean {
  return (
    /^\s*(server|http|events|upstream)\s*\{/m.test(code) ||
    (/[;{]\s*$/m.test(code) &&
      /\b(location|proxy_pass|server_name|listen|root|index|keepalive_timeout|client_max_body_size|gzip|ssl_certificate|add_header|rewrite|try_files)\b/.test(
        code,
      ))
  );
}

function looksLikeSql(code: string): boolean {
  return /^\s*(select\s+.+\s+from|insert\s+into|update\s+\S+\s+set|delete\s+from|create\s+(table|database|index)|alter\s+table|drop\s+table)\b/im.test(
    code,
  );
}

function looksLikeDockerfile(code: string): boolean {
  return /^(FROM|RUN|COPY|ADD|CMD|ENTRYPOINT|WORKDIR|EXPOSE|ENV|ARG)\s+\S/m.test(code);
}

/** YAML：多行 `key: value`，且没有 shell 的 `;` 结尾与 JSON 的花括号。 */
function looksLikeYaml(code: string): boolean {
  const lines = code.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (lines.length < 2) return false;
  if (/[;{}]/.test(code)) return false;
  const pairs = lines.filter((line) => /^\s*(-\s+)?[\w.$-]+:\s*\S?/.test(line)).length;
  return pairs >= 2 && pairs / lines.length >= 0.6;
}

/** 返回 shiki 认识的语言名，判不出来返回空串。 */
export function detectLanguage(code: string): string {
  if (!code.trim()) return "";
  if (code.includes("<?php")) return "php";
  if (isJson(code)) return "json";
  if (looksLikeSql(code)) return "sql";
  if (looksLikeNginx(code)) return "nginx";
  if (looksLikeDockerfile(code)) return "dockerfile";
  if (looksLikeYaml(code)) return "yaml";
  if (looksLikeShell(code)) return "bash";
  return "";
}

function walk(node: HastNode): void {
  if (node.type === "element" && node.tagName === "pre") {
    const code = (node.children ?? []).find(
      (child) => child.type === "element" && child.tagName === "code",
    );
    if (code) {
      const properties = (code.properties ??= {});
      const declared = classList(properties.className)
        .map((name) => firstWord(name))
        .find(Boolean);
      if (NO_LANGUAGE.has(declared ?? "")) {
        const guess = detectLanguage(textOf(code));
        if (guess) properties.className = [`language-${guess}`];
      }
    }
  }
  for (const child of node.children ?? []) walk(child);
}

export function rehypeCodeDetect() {
  return (tree: HastNode): void => {
    walk(tree);
  };
}

export default rehypeCodeDetect;
