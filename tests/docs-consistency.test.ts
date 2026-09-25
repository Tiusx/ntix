import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 文档与配置的一致性护栏。
 *
 * 此前 README 链接了不存在的 docs/memos-setup.md、分类白名单多出一个
 * CATEGORY_META 里没有的「读书」、env 变量名与代码不一致、IndexNow key 路径
 * 说明与实现不符——这些都是没有任何机制能发现的漂移。
 */
const ROOT = process.cwd();
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel: string): boolean => fs.existsSync(path.join(ROOT, rel));

const DOCS = ["README.md", "docs/memos-setup.md", "docs/post-template.md"];

describe("文档内部链接", () => {
  it.each(DOCS)("%s 存在", (doc) => {
    expect(exists(doc)).toBe(true);
  });

  it.each(DOCS)("%s 的相对链接均可解析", (doc) => {
    const text = read(doc);
    const links = [...text.matchAll(/\]\(([^)#][^)]*)\)/g)].map((m) => m[1]);
    for (const link of links) {
      if (/^https?:/.test(link)) continue;
      const target = path.resolve(ROOT, path.dirname(doc), link.split("#")[0]);
      expect(fs.existsSync(target), `${doc} → ${link}`).toBe(true);
    }
  });
});

describe("README 与 package.json 一致", () => {
  const PNPM_BUILTIN = new Set(["install", "add", "remove", "dlx", "exec", "create", "why"]);

  it("README 提到的每个 pnpm 脚本都存在", () => {
    const pkg = JSON.parse(read("package.json"));
    const mentioned = [...read("README.md").matchAll(/pnpm ([a-z:]+)/g)].map((m) => m[1]);
    expect(mentioned.length).toBeGreaterThan(0);
    for (const name of new Set(mentioned)) {
      if (PNPM_BUILTIN.has(name)) continue;
      expect(Object.hasOwn(pkg.scripts, name), `pnpm ${name}`).toBe(true);
    }
  });
});

describe(".env.example 与代码一致", () => {
  function collectCode(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) collectCode(p, out);
      else if (/\.tsx?$/.test(entry.name)) out.push(p);
    }
    return out;
  }

  it("每个声明的环境变量都在代码中被读取", () => {
    const vars = [...read(".env.example").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
    expect(vars.length).toBeGreaterThan(0);
    const code = [...collectCode(path.join(ROOT, "src")), ...collectCode(path.join(ROOT, "scripts"))]
      .map((f) => fs.readFileSync(f, "utf8"))
      .join("\n");
    for (const v of vars) {
      expect(code, `.env.example 的 ${v}`).toContain(`process.env.${v}`);
    }
  });
});

describe("分类注册表与文档一致", () => {
  function categoryKeys(): string[] {
    const posts = read("src/lib/posts.ts");
    const block = posts.match(/CATEGORY_META: Record<string, string> = \{([\s\S]*?)\n\};/);
    expect(block, "未能解析 CATEGORY_META").not.toBeNull();
    return [...block![1].matchAll(/^\s{2}([^\s:]+):/gm)].map((m) => m[1]);
  }

  it("README 声称的分类与 CATEGORY_META 完全一致", () => {
    const cats = categoryKeys();
    const claimed = read("README.md").match(/当前分类：(.+?)。/);
    expect(claimed, "README 未声明当前分类").not.toBeNull();
    const text = claimed![1];
    for (const c of cats) {
      expect(text, `README 缺少分类 ${c}`).toContain(c);
    }
    // README 不得出现注册表之外的分类
    for (const token of text.split(/[\/、,，\s]+/).filter(Boolean)) {
      expect(cats, `README 多出未注册分类 ${token}`).toContain(token);
    }
  });

  it("docs/post-template.md 使用的分类已注册", () => {
    const template = read("docs/post-template.md");
    const m = template.match(/^category:\s*"(.+?)"/m);
    expect(m, "模板未声明 category").not.toBeNull();
    expect(categoryKeys()).toContain(m![1]);
  });
});

describe("IndexNow key 路径三处一致", () => {
  it("代码、.env.example 与 public/ 实际文件一致", () => {
    const idx = read("scripts/submit-indexnow.ts");
    const m = idx.match(/keyLocation = `https:\/\/\$\{host\}\/([^`$]+)\$\{key\}/);
    expect(m, "未能解析 keyLocation").not.toBeNull();
    const pattern = m![1];

    const envLine =
      read(".env.example")
        .split("\n")
        .find((l) => l.includes("indexnow-key")) ?? "";
    expect(envLine).toContain(`public/${pattern}`);

    const keys = fs.readdirSync(path.join(ROOT, "public")).filter((f) => f.startsWith(pattern));
    expect(keys.length, "public/ 下应有 indexnow key 文件").toBeGreaterThan(0);
  });
});
