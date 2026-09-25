import { withRssCanonical, ogDefaultImage } from "@/lib/seo";
import type { Metadata } from "next";
import { getAllPosts, getPostPageCount, getPostsPage } from "@/lib/posts";
import { PostList } from "@/components/post-list";
import { Pagination } from "@/components/pagination";
import { SITE_CONFIG } from "@/site.config";

export const metadata: Metadata = {
  title: "文章",
  description: "技术笔记、开发实录与思考记录",
  alternates: withRssCanonical("/blog/"),
  openGraph: {
    title: "文章列表",
    description: "技术笔记、开发实录与思考记录",
    url: "/blog/",
    images: ogDefaultImage(),
  },
  twitter: {
    card: "summary",
    title: "文章列表",
    description: "技术笔记、开发实录与思考记录",
  },
};

export default function BlogPage() {
  const all = getAllPosts();
  const pageCount = getPostPageCount(SITE_CONFIG.postsPerPage);
  const posts = pageCount === 1 ? all : getPostsPage(1, SITE_CONFIG.postsPerPage);

  return (
    <main className="content pt-12 pb-12">
      <h1 className="mb-3 font-serif text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
        Articles
      </h1>
      <p className="mb-10 text-base text-muted">{all.length} posts.</p>

      <PostList posts={posts} dense page={1} />

      {pageCount > 1 ?       <Pagination current={1} total={pageCount} basePath="/blog" /> : null}
    </main>
  );
}