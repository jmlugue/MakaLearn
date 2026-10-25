# Playground checking and grammar materials

The optional primary checker accepts standard-English words, phrases, sentences,
commands, and questions. It permits missing capitalization and final punctuation
because the board uses printed cards. It does not supply missing articles or
other words: **You are a teacher** is valid; **You are teacher** is invalid.
Card roles are not restrictions on this checker. Gemini receives only assembled
text, never images, uploaded recordings, user identities, or learner information.

## Configuration

Apply `20261025135800_playground_checker_and_grammar.sql` and
`20261025142300_restrict_playground_sequences.sql`, then configure these
server-only settings alongside the existing Supabase configuration:

```dotenv
PLAYGROUND_CHECKER_MODE=ai
GEMINI_PLAYGROUND_API_KEY=
GEMINI_PLAYGROUND_MODEL=gemini-3.5-flash-lite
```

The dedicated key is separate from gesture feedback, activity generation, and
new-material preparation. Never put it in a `NEXT_PUBLIC_` variable. Use
`PLAYGROUND_CHECKER_MODE=algorithm` to bypass both the provider and saved grades
and restore the original validator. Restart the locally managed server after
changing environment settings. Application deployment and hosted environment
settings are separate from applying the database migration.

## Decisions and outages

`POST /api/playground-check` accepts `cardIds` (one to five). Active teachers and
admins, including their Student Mode sessions, can check eligible PECS cards. The
route resolves labels from current database rows; supplied labels are ignored.
The response contains only a constrained verdict/classification, never generated
feedback. Check and Listen map it to the existing local wording and presentation.

The server first reads an existing decision, then claims an uncached input before
calling Gemini. Accepted and rejected decisions share a stable policy version and
SHA-256 key over normalized ordered text. Case and whitespace normalize; word
order and meaningful punctuation remain significant. A model change does not
invalidate stored decisions. Grades never expire automatically.

The service-owned tables have RLS and no client grants or policies. The invoker
RPC is executable only by `service_role`. A database transaction coordinates the
input lease and quota across app instances. Paid requests are limited to 30 per
minute and 300 per day per account, and 3,000 per day globally. Cache hits consume
no provider quota. Request counters retain seven days; decisions are permanent.

Another request waits up to nine seconds for an existing claim. Claims expire
after 30 seconds. Provider calls time out after eight seconds; client requests
are bounded at 15 seconds. Provider/format/quota/database failures use the local
algorithm without saving its grade as an AI decision. Failed claims have a
60-second cooldown. Therefore an uncached fallback verdict can differ from a
later authoritative AI decision. Saved grades remain available without a
provider key, provided mode is `ai` and Supabase is available.

Editing, clearing, or leaving the board aborts pending client work and invalidates
late responses. No AI labels, provider errors, or generated explanations are
shown. Standard verdict/classification/feedback stay fixed; Maki's existing
random cheers and expressions are preserved.

## Administrator corrections

An active admin can deliberately correct a decision outside the Playground UI:

```http
POST /api/admin/playground-decision
Content-Type: application/json

{"text":"I am sorry","decision":{"valid":true,"type":"sentence"}}
```

Use the administrator's normal authenticated session. Invalid decisions require
`{"valid":false,"type":null}`. The service-only correction RPC checks the admin
role again and writes a correction history atomically. An administrator's
correction wins over an older in-flight provider request. Changing the rubric
requires an explicit policy-version change and revalidation, not an automatic
cache clear when deploying or selecting another model.

## Grammar cards and recordings

`public/pecs/grammar_card_manifest.json` defines A, An, The, To, And, and Not.
These original placeholder cards are not official Makaton symbols. They have
explicit `grammar_kind` metadata and no invented object/action sentence role.
They do not alter the original 50-card MSAV manifest or validator.

Standard labelled images and separate word-free activity cues use 900 by 1200
PNG files in `generated_cards` and `generated_cards_no_text`. Recreate them with
`python scripts/generate-grammar-cards.py` (Pillow and Windows Arial Bold).
Recordings can be recreated with `powershell -File scripts/generate-grammar-audio.ps1`.
The cues alone cannot uniquely identify article/be-verb answers. New grammar
cards and Am/Is/Are are excluded from generic picture choices and legacy saved
questions at runtime. No saved activity is rewritten. One existing activity
contains Am; its remaining eligible questions are retained.

Word-free grammar assets are uploaded as media records, but their Activity URL
on the material is deliberately unset until a contextual question format exists.
Standard grammar images use a separate Storage directory so older clients do not
infer generic Activity eligibility. Content describes the context requirement.

Publish the six materials and corrected I recording using the explicit script:

```powershell
node scripts/publish-grammar-materials.mjs                 # dry run
node scripts/publish-grammar-materials.mjs --apply         # configured project
```

The script backs up the affected material rows and prior I recording under
Git-ignored `supabase/backups/playground-grammar/`. The replacement pronoun uses
`i-pronoun-v2.wav` to avoid stale cached audio. Browser speech maps isolated I to
the homophone eye; sentence narration retains the pronoun and word boundaries.
Playground continues to use the shared voice chosen in Settings.

## Verification

Run Playground, activity, audio, and media suites, TypeScript, lint, material
validation, and production build with the development server stopped. A database
check script is available in `scripts/test-playground-checker-db.sql`; its writes
are rolled back. `scripts/check-playground-provider.mjs` is an opt-in real-model
check using only the dedicated key, without populating the permanent cache.

Current material validation has three previously documented activities pointing
to deleted test materials. These records are unrelated to grammar/checker work
and are preserved for the owner's review.
