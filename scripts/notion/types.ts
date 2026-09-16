export interface FetchResult {
  updated: number;
  skipped: number;
  errors: number;
  deleted: number;
}

export type SyncMode = "incremental" | "full-sync" | "force";

export interface FetchStateEntry {
  lastSuccessfulRun: string;
  lastFullSync: string;
}

export interface FetchState {
  [label: string]: FetchStateEntry;
}

export interface PostMetadata {
  page_id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  date: string;
  summary: string;
  cover: string;
  status: string;
  last_edited_time: string;
  last_fetched_time: string | null;
}