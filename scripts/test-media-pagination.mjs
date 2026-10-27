import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { loadTs } from "./load-ts.mjs";

const { mediaPageQuery, MEDIA_PAGE_SIZE } = loadTs("src/lib/supabase/media-library-query.ts");
const defaults = { type: "all", link: "all", sort: "newest", search: "", itemIds: [], userIds: [] };
let requests = [], replies = [];
const client = createClient("https://fixture.supabase.co", "fixture-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (url, init) => {
    requests.push({ url: new URL(url), method: init?.method, headers: new Headers(init?.headers) });
    const reply = replies.shift() ?? { data: [], count: 65 };
    return new Response(init?.method === "HEAD" ? null : JSON.stringify(reply.data), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json", "Content-Range": `0-23/${reply.count ?? 65}` }
    });
  } }
});
const media = loadTs("src/lib/supabase/media.ts", {
  "@/lib/supabase/client": { getSupabaseBrowserClient: () => client },
  "@/lib/supabase/media-library-query": { mediaPageQuery }
});

test("each media page requests only 24 records with stable ordering and an exact count", async () => {
  requests = [];
  for (const page of [1, 2, 3]) await media.fetchMediaPage(defaults, page);
  assert.equal(MEDIA_PAGE_SIZE, 24);
  assert.deepEqual(requests.map(({ url }) => url.searchParams.get("offset")), ["0", "24", "48"]);
  assert(requests.every(({ url, headers }) => url.searchParams.get("limit") === "24" && url.searchParams.get("order") === "uploaded_at.desc,id.asc" && headers.get("prefer").includes("count=exact")));
});

test("image/audio/link filters and all sort orders reach the database before pagination", async () => {
  requests = [];
  await media.fetchMediaPage({ ...defaults, type: "symbol-image", link: "unlinked", sort: "name-asc" }, 2);
  let params = requests.at(-1).url.searchParams;
  assert.equal(params.get("type"), "in.(symbol-image,activity-image)");
  assert.equal(params.get("related_item_id"), "is.null");
  assert.equal(params.get("order"), "file_name.asc,id.asc");
  await media.fetchMediaPage({ ...defaults, type: "audio-file", link: "linked", sort: "oldest" }, 1);
  params = requests.at(-1).url.searchParams;
  assert.equal(params.get("type"), "eq.audio-file");
  assert.equal(params.get("related_item_id"), "not.is.null");
  assert.equal(params.get("order"), "uploaded_at.asc,id.asc");
  await media.fetchMediaPage({ ...defaults, sort: "name-desc" }, 1);
  assert.equal(requests.at(-1).url.searchParams.get("order"), "file_name.desc,id.asc");
});

test("search includes matching material/uploader IDs and quotes punctuation and wildcards", async () => {
  requests = [];
  await media.fetchMediaPage({ ...defaults, search: 'Eat, (100%)_"', itemIds: ["item-1"], userIds: ["user-1"] }, 1);
  const expression = requests[0].url.searchParams.get("or");
  assert(expression.includes('related_item_id.in.("item-1")'));
  assert(expression.includes('uploaded_by.in.("user-1")'));
  assert(expression.includes('title.ilike."%Eat, (100\\\\%)\\\\_\\\"%"'));
  assert(expression.includes("file_name.ilike."));
});

test("badges use HEAD counts and linked-file removal uses one bounded lookup", async () => {
  requests = []; replies = [{ count: 149 }, { count: 78 }, { count: 64 }];
  assert.deepEqual(await media.fetchMediaCounts(), { all: 149, images: 78, audio: 64 });
  assert(requests.every(({ method }) => method === "HEAD"));
  assert.equal(await media.fetchLinkedMedia("item-1", "audio-file", "https://file.invalid/a.wav"), undefined);
  const params = requests.at(-1).url.searchParams;
  assert.equal(params.get("limit"), "1");
  assert.equal(params.get("related_item_id"), "eq.item-1");
  assert.equal(params.get("public_url"), "eq.https://file.invalid/a.wav");
});

test("failed pages reject, while a removed final page recounts without downloading the library", async () => {
  replies = [{ status: 500, data: { message: "offline" } }];
  await assert.rejects(media.fetchMediaPage(defaults, 1));
  requests = []; replies = [{ status: 416, data: { code: "PGRST103", message: "range gone" } }, { data: [], count: 24 }];
  assert.deepEqual(await media.fetchMediaPage(defaults, 2), { assets: [], count: 24 });
  assert.deepEqual(requests.map(({ url }) => url.searchParams.get("offset")), ["24", "0"]);
});
