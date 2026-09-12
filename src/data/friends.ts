export interface Friend {
  name: string;
  url: string;
  description?: string;
}

export const FRIENDS: Friend[] = [
  {
    name: "Notion",
    url: "https://www.notion.so",
    description: "内容源：写作与数据库都在这里",
  },
  {
    name: "Next.js",
    url: "https://nextjs.org",
    description: "博客的渲染框架",
  },
  {
    name: "Cloudflare Pages",
    url: "https://pages.cloudflare.com",
    description: "静态托管与全球 CDN",
  },
];