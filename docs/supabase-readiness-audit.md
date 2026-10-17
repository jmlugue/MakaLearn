# Supabase readiness review — 17 October 2026

Project: `tjqwyogtawkhyviljzrr` (the repository's linked hosted project).

Status: the owner approved verified-unused retirement, and the cleanup below is applied to the hosted
project. The application changes are local and ready for the user's normal commit/deployment flow;
this session did not deploy or commit the application.

## Applied cleanup and verification

The owner explicitly approved removing anything verified unused, provided the current system keeps
working. After rechecking dependencies and saving Git-ignored recovery snapshots, this session:

- Removed both saved learner records (the two original seeded records), the learner table, and the
  empty gesture-attempt table. Removed their unused UI, helpers, app types, seed entries, loader
  queries, and validator queries. The `/learners` redirect remains.
- Left empty read-only `learners` and `practice_attempts` compatibility views because older deployed
  bundles/validators still SELECT those names. They retain no learner or attempt records and cannot
  be used to create new ones.
- Removed five unused enum types: `practice_status`, `practice_attempt_status`, `ai_usage_status`,
  `learner_status`, and `preferred_learning_mode`. Explicit dependency guards refuse removal if a
  new dependency appears. Quota tables do not use `ai_usage_status`.
- Removed two retired activities with no results or collection associations and their ten questions.
  Kept the five active activities and all 11 Student Mode result records.
- Removed 13 obsolete AI generations. The initial audit incorrectly called v7 current; the current
  source actually uses v8, so the two v7 records were obsolete too. Kept all 50 reusable templates
  and all 130 usage/quota events. Future/current cache versions are excluded from the deletion.
- Removed the 11 reviewed Storage paths through the Storage API and deleted the empty
  `learner-photos` bucket. All 129 remaining files have Media records, and all 129 Media records
  resolve to files. Recovery copies of removed files were saved before deletion.
- Removed six unused result columns: `learner_id`, `activity_type`, `score_percentage`, `saved_by`,
  `time_spent_seconds`, and `completed_at`. Guards proved no learner links or nonredundant values;
  every removed completion timestamp equalled the preserved `created_at`. Active score, counts,
  teacher, source, duration in `answers`, and timestamps remain intact. The unused
  `related_learning_item_ids` array remains as legacy compatibility metadata.

Canonical API names are now `collections`, `collection_items`, and `collection_id`; the source enum
is `collection_source`. These are updatable security-invoker views over the existing tables, with
an invoker/RLS-protected `upsert_collection_items` helper for reordering. The data adapter uses
`Collection`, `insertCollection`, `updateCollection`, and `deleteCollection`; new audit entries and
deep links use Collection terminology, with old entries/links still readable. New IDs start with
`collection-`; existing IDs are unchanged.

**Why `lessons` and `lesson_items` still exist:** older deployed clients still write/upsert those
tables. Removing or merely replacing them with views would break those writes. They are deliberately
retained compatibility backing tables, not unused leftovers. After the new application is deployed
and old clients are retired, a later coordinated migration can change physical storage names too.
The UI's `Lesson` type remains a deprecated alias of `Collection` during that transition.

Applied migrations (local filenames match hosted history):

- `20261017055805_collection_api_names`
- `20261017055935_retire_unused_learning_features`
- `20261017060023_remove_unreferenced_legacy_enums`
- `20261017060030_prune_retired_activity_data`
- `20261017062157_prune_unused_result_columns`

All 24 local/hosted migration identities now match; `supabase db push --dry-run` reports the remote
database is up to date and has no pending migrations.

The initial combined retirement migration was rejected by automatic approval review. It was split
into narrower migrations, and catalog queries proved the enum dependencies before the revised
migrations were accepted. No rejected operation was bypassed.

Verification:

- Hosted role checks in `supabase/verify-readiness.sql` passed Collection create/edit/reorder/delete,
  old table upserts, private teacher isolation, admin read-only behavior, anonymous denial, and the
  actual Student Mode result payload. Every test write was rolled back. These simulate JWT subjects
  at the database layer; they do not test password sign-in.
- The real application adapter loaded hosted data through the new API; anonymous HTTP access was
  denied. Three optional password-based teacher/admin HTTP tests explicitly skipped because the
  workspace has no `TEST_*` credentials. They remain available as `npm run test:readiness:db`.
- Activity regressions passed all 60 tests. TypeScript, lint, material validation, production build,
  and whitespace checks passed. Material validation retains only existing Eat/Drink duplicate-label
  warnings. No paid model call, dev server, or production application deployment was started.
- Preserved: 60 materials, 129 Media records, two collections, 33 collection links, 11 usage results,
  50 prompt templates, and 130 quota events. Remaining active activities/questions: five/24.
- The security advisor still reports only the existing leaked-password-protection warning. Six
  informational unused-index notices remain; these were not sufficient evidence to drop the indexes.

Recovery snapshots are under `supabase/backups/` and excluded from Git. They include application
table records and the removed files, not secrets or Auth passwords. Do not commit these snapshots.
Bucket/asset enum labels for retired learner photos remain intentionally; replacing a shared enum
solely to remove an unused label is unnecessary risk while old clients exist.

The following sections record the **initial audit before approval**, not the current post-cleanup
inventory. Current outcomes above supersede the old recommendations and pending statuses below.

## What is currently used

| Hosted table | Observed rows | Current purpose |
| --- | ---: | --- |
| `profiles` | 10 | Auth identity, active status, and teacher/admin authorization |
| `categories` | 13 | Material categories, including Playground filtering |
| `learning_items` | 60 | PECS and gesture materials, both picture purposes, MSAV preparation |
| `media_assets` | 129 | Uploaded-file inventory and material attachments |
| `lessons` | 2 | Collections; still uses the previous database name |
| `lesson_items` | 33 | Ordered collection materials |
| `activities` | 7 | Five active-type activities and two hidden retired-type activities |
| `activity_items` | 34 | Saved activity questions |
| `activity_results` | 11 | Completed Student Mode rounds used by Admin's Activity usage chart |
| `audit_logs` | 412 | Sign-in, content, account, and activity history |
| `activity_prompt_templates` | 50 | Reusable material prompts; eight defaults and 42 teacher templates |
| `activity_prompt_generations` | 13 | AI prompt cache/history; eight Hugging Face and five Gemini generations |
| `ai_usage_events` | 130 | AI call history, quota enforcement, and cooldown checks |
| `user_settings` | 5 | Accessibility, display, and Guide mode settings |
| `account_requests` | 4 | Teacher access requests and review history |
| `learners` | 2 | Retired UI, but saved learner records remain and the common data loader still queries them |
| `practice_attempts` | 0 | Retired gesture-attempt persistence; still queried by material validation |

Counts are exact SELECT counts, not the approximate table-summary statistics (which incorrectly
reported zero learners, eight categories, and 130 media rows). They are a hosted snapshot, not a
promise that a table remains unchanged after the audit.
An empty table or an unused index alone is not proof that it can be removed.

### Activity results must stay

`activities-view.tsx` calls `insertActivityPlay` after a teacher completes a Student Mode round.
`AdminPanelView` calls `fetchActivityPlays` to populate the usage chart. All 11 hosted results have
`answers.source = 'student-mode'`, dated 3 October 2026.

The old `insertActivityResult` and `fetchActivityResults` helpers have no current callers, but that
does **not** make the table unused. Teacher-player scores remain in memory; Student Mode completion
records persist score/counts plus duration in `answers`. Gesture attempts never persist.

## Naming that still needs migration

| Current internal/database name | Current product term | Required handling |
| --- | --- | --- |
| `lessons` | `collections` | Rename the populated table, preserving rows, permissions, and dependencies |
| `lesson_items` | `collection_items` | Rename the join table |
| `lesson_items.lesson_id` | `collection_items.collection_id` | Update reads, inserts, upserts, filters, and validation together |
| `lesson_source` | `collection_source` | Rename the enum while preserving its values |
| `lessons_related_activity_id_*`, lesson policies/triggers/index names | Collection equivalents | Update names and inspect function bodies and policy expressions |
| `Lesson`, `insertLesson`, `updateLesson`, `deleteLesson`, `data.lessons`, lesson components/utilities | Collection equivalents | Coordinate the TypeScript refactor with the database rollout |
| Audit `target_type = 'lesson'` / `'lesson-draft'` | `collection` / `collection-draft` | Write new names going forward; retain readers for the 16 historical entries |
| `?open=lesson`, lesson-related tab keys | Collection navigation | Accept existing links during the transition |
| Persisted `lesson-*` / `activity-lesson-*` IDs and title fallbacks | Stable identifiers | Preserve existing values; renaming identifiers could disconnect activities |
| `learning_items`, `learning_item_id`, `learning_item_ids`, audit `learning-item` | Materials | Internal legacy vocabulary; optional coordinated rename, not unused data |
| `symbol_image_url`, `symbol-images` | Standard PECS card picture | Keep distinct from `activity_image_url`; do not merge these media purposes |

The Sep 30 note in `CLAUDE.md` explicitly describes the earlier Collection change as screen text only.
There is no `collections` table or compatibility view in the hosted schema yet.

### Proposed collection rollout

1. Preserve a schema/data backup and capture the current grants, policies, triggers, and constraints.
2. Prepare a compatibility release that can work with either schema. Update database types, adapters,
   validators, tests, audit writers, and navigation aliases together.
3. Apply a tracked migration renaming tables/column/enum and dependent names in one transaction.
   Keep saved IDs and relationships intact. Check SQL function bodies for textual old-table references.
4. Deploy the collection release and verify teacher/admin reads and writes under their own RLS roles.
   Verify create, edit/reorder, copy, delete, private/shared visibility, and activity association.
5. Remove compatibility objects only after a separate owner decision and after old clients are retired.

Simply renaming the tables now would break the deployed app. Merely adding aliases would leave the
old schema names in place. Legacy views also need careful handling: the current collection-material
update path uses `upsert`, which is not automatically equivalent to writing through a view.

## Removal decisions for the owner

No removal SQL has been added to the migrations directory.

| ID | Candidate | Evidence and dependencies | Recommendation |
| --- | --- | --- | --- |
| R1 | `practice_attempts`, its policies/indexes, `practice_attempt_status` | Zero rows; no active gesture read/write caller; material validator and dormant helpers/types still reference it | Remove with matching code/validator cleanup if gesture history is permanently retired |
| R2 | `learners`, its policies/indexes, `learner_status`, `preferred_learning_mode` | Two saved records; `/learners` redirects; common `fetchMakaLearnData` still queries it; `practice_attempts.learner_id` and `activity_results.learner_id` have foreign keys | Preserve/export the records unless the owner explicitly approves their deletion; detach the loader/dormant UI and decide the legacy learner columns/FKs first |
| R3 | Empty `learner-photos` bucket and associated enum values | Zero files; dormant upload support remains; `media_asset_type` and `media_bucket` retain learner-photo values | Remove bucket with retired learner feature; defer enum-value replacement unless worth its migration complexity |
| R4 | `practice_status` and `ai_usage_status` enum types | No table-column usage; catalog dependencies are only their automatic array types | Remove if no external integration needs these obsolete types |
| R5 | Two hidden activities (`simple-quiz`, `choose-correct-symbol`) and their questions | One saved activity per retired type; still part of stored content/history | Keep unless the owner explicitly wants these teaching records deleted; do not remove enum values just because the UI hides them |
| R6 | Eight Hugging Face generations and three older Gemini generations | Current cache uses Gemini and prompt version v7; two v7 rows remain current | Optional history cleanup; keep current cache, reusable templates, and quota tables |
| R7 | 11 Storage objects absent from `media_assets` | No direct reference in any current material image, Activity image, gesture-media, or audio URL; paths listed below | Review individually before deletion; absence from Media alone is insufficient proof |
| R8 | Legacy columns in `activity_results` | All 11 rows have null `learner_id`, `saved_by`, `activity_type`, `score_percentage`; `time_spent_seconds` stays zero; active duration is stored in `answers` | Defer to a separate result-schema cleanup; preserve active score/count/source/duration data |

Supabase reports eight unused indexes. Keep them for now: several support foreign keys or expected
filter queries, and a small database often does not choose an index scan. Reassess after approved
feature retirement rather than automatically dropping advisor suggestions.

### R7 file list

| Bucket | Object path |
| --- | --- |
| `audio-files` | `learning-content/gesture-references/audio/gesture-drink-water.wav` |
| `audio-files` | `learning-content/gesture-references/audio/gesture-eat-food.wav` |
| `audio-files` | `learning-content/pecs/audio/am-word.wav` |
| `audio-files` | `learning-content/pecs/audio/am.wav` |
| `audio-files` | `learning-content/pecs/audio/hurt-word.wav` |
| `audio-files` | `learning-content/pecs/audio/hurt.wav` |
| `gesture-media` | `item-drink/673a1a8b-ee89-4884-ad0e-76a974b70006-screenshot-2026-06-19-153649.png` |
| `symbol-images` | `item-drink/b50f24c5-508c-4ea0-90e8-1dd924c5a619-drinking.png` |
| `symbol-images` | `item-drink/d9e72705-653c-4f1d-8dab-33e9755fe1fb-drinking.png` |
| `symbol-images` | `item-eat/45582f2e-7041-461e-99ea-266c0cdf4ddd-eating.png` |
| `symbol-images` | `item-hello/cee8b1a6-99f3-4e90-bece-83db70dfbfa8-stop.png` |

These are candidates, not a deletion manifest. External consumers and historical exported links
cannot be ruled out through repository/database inspection. Recheck references immediately before
any approved deletion, and use the Storage API rather than deleting `storage.objects` metadata.

## Other readiness findings

- **Migration identity mismatch, repaired locally:** the hosted Activity picture migration is
  `20261012022620_add_activity_images`, while the local file was timestamped `20261012021919`.
  Renamed the local file to the hosted version without changing its SQL or hosted history.
  The other 18 local migration identities match the hosted list.
- **Fresh-project bootstrap is incomplete:** the first tracked migration assumes core tables and
  types already exist. `supabase/schema.sql` contains the older bootstrap plus later appended
  changes, not a migration replay proven against an empty database. A successful hosted audit
  does not establish that `supabase db reset` or a new project works. Build and test a proper
  baseline on an isolated local database; do not replay that bootstrap on the live project.
- **Schema/type drift:** `src/types/database.ts` is a hand-maintained app projection, not generated
  schema truth. For example, hosted `activity_results.teacher_id` and `score` allow null but the
  Row type requires values; several hosted legacy result/attempt columns are absent from the
  types. Hosted media enums still include learner-photo values absent from the current types.
  Regenerate/align types as part of the agreed schema migration and handle historical nulls.
- **Authorization:** all 17 public tables have RLS enabled. The role helper requires an active
  profile, the Auth trigger starts new accounts as invited teachers, and the privileged public
  trigger functions are not executable by anonymous/authenticated callers. This is a catalog
  review, not a fresh end-to-end signed-in permissions test.
- **Broad old grants:** most application tables retain broad Supabase default grants, including
  `TRUNCATE` for Data API roles. RLS controls row operations, not TRUNCATE; PostgREST does not
  provide a normal truncate endpoint. Explicit least-privilege grants deserve a separate migration
  and role tests; account requests already have narrower grants. No grants were changed here.
- **Auth:** Supabase's security advisor reports leaked-password protection disabled. Availability
  depends on the project's plan. Check the dashboard setting before claiming production readiness.
  Hosted signup/redirect/rate-limit settings were not reverified through a management API in this audit.
- **Storage:** 69 symbol objects, eight gesture objects, 63 audio objects, and zero learner photos.
  Every one of the 129 media records resolves to an existing Storage object. Current bucket limits
  match the app's 10 MB images, 50 MB gesture media, and 20 MB audio limits. The four buckets are
  public; treat learning media as public content, not confidential learner information.
- **Application loading:** `fetchMakaLearnData` still reads the retired learners table and reads
  several tables without pagination. The hosted API caps a response at 1,000 rows; add pagination
  before those datasets grow beyond that cap. The present inventory is below it.
- **Documentation:** README still claimed automatic lesson-to-activity creation and simulated
  gesture recognition. Corrected those descriptions and linked this audit.

## Evidence and repeatable checks

The review compared current callers, all hosted public tables/columns, RLS policies, functions and
grants, enum dependencies, migration history, Storage metadata, and Supabase security/performance
advisors. It did not create test accounts, delete test fixtures, call paid AI models, or start a server.

`supabase/readiness-audit.sql` reproduces the inventory using SELECT statements in a read-only
transaction. Run it through an authorized administrative SQL connection; it includes aggregate
Auth counts and Storage object paths but no account names, email addresses, tokens, or keys.

Official references: [migration history and team deployments](https://supabase.com/docs/guides/deployment/database-migrations),
[RLS and view behavior](https://supabase.com/docs/guides/database/postgres/row-level-security),
[password protection](https://supabase.com/docs/guides/auth/password-security).

Verification completed: the read-only SQL audit executed successfully on the hosted project; all 19
local/hosted migration identities match; TypeScript, lint, production build, and patch whitespace
checks passed. Live material validation passed with only the existing duplicate Eat/Drink label
warnings. The validator required network permission after the sandboxed attempt could not connect.
The CLI help/version probe could not write its user-profile telemetry file under the sandbox;
migration-history comparison used the connected Supabase tools instead. No migration push or reset
was attempted.

Remaining limits after cleanup: physical Collection backing-table renames require retiring old
deployed writes; a fresh-project baseline is still unverified; broad default grants deserve a
separate least-privilege review; and leaked-password protection remains a dashboard/plan setting.
The live application schema and its exercised flows are verified, not a blanket certification of
every production setting. Current result nullability is aligned in the application types; the
hand-maintained types remain an app projection rather than a complete generated catalog.
