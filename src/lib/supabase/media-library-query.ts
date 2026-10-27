import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const MEDIA_PAGE_SIZE = 24;
export type MediaFilters = {
  type: "all" | "symbol-image" | "audio-file";
  link: "all" | "linked" | "unlinked";
  sort: "newest" | "oldest" | "name-asc" | "name-desc";
  search: string;
  itemIds: string[];
  userIds: string[];
  /** When the fallback name matches, also find uploads without a named profile. */
  namedUploaderIds?: string[];
};

/** Apply filters before the range, so search covers the library rather than only the visible page. */
export function mediaPageQuery(client: SupabaseClient<Database>, filters: MediaFilters, page: number) {
  let query = client.from("media_assets").select("*", { count: "exact" });
  if (filters.type === "symbol-image") query = query.in("type", ["symbol-image", "activity-image"]);
  if (filters.type === "audio-file") query = query.eq("type", "audio-file");
  if (filters.link === "linked") query = query.not("related_item_id", "is", null);
  if (filters.link === "unlinked") query = query.is("related_item_id", null);
  const search = filters.search.trim();
  if (search) {
    // Quote PostgREST values and escape LIKE wildcards. Commas/parentheses must remain literal text.
    const pattern = JSON.stringify(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const terms = [`title.ilike.${pattern}`, `file_name.ilike.${pattern}`];
    if (filters.itemIds.length) terms.push(`related_item_id.in.(${filters.itemIds.map((id) => JSON.stringify(id)).join(",")})`);
    if (filters.userIds.length) terms.push(`uploaded_by.in.(${filters.userIds.map((id) => JSON.stringify(id)).join(",")})`);
    if (filters.namedUploaderIds) {
      terms.push("uploaded_by.is.null");
      terms.push(filters.namedUploaderIds.length
        ? `uploaded_by.not.in.(${filters.namedUploaderIds.map((id) => JSON.stringify(id)).join(",")})`
        : "uploaded_by.not.is.null");
    }
    query = query.or(terms.join(","));
  }
  const byName = filters.sort.startsWith("name-");
  const ascending = filters.sort === "oldest" || filters.sort === "name-asc";
  const from = Math.max(0, page - 1) * MEDIA_PAGE_SIZE;
  return query.order(byName ? "file_name" : "uploaded_at", { ascending }).order("id").range(from, from + MEDIA_PAGE_SIZE - 1);
}
