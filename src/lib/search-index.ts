/**
 * 全文搜索索引条目。
 * 站点侧（src/components/search-box.tsx）与生成侧共用此定义，避免逐字重复。
 */
export interface SearchEntry {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
}
