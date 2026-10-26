# Material category review — 26 October 2026

Reviewed all **67 saved learning materials** in the connected MakaLearn project: 60 PECS records and seven guided gesture records. Added **Polite Words**, **People**, and **Health**, and corrected **17 saved category assignments**. The existing **Choices** and **Grammar** categories are reused.

| Category | Reviewed materials |
| --- | --- |
| Greetings | Hello, Goodbye, Good morning |
| Polite Words (new) | Please, Thank you, Sorry |
| Emotions | Angry, Happy, Sad, Scared |
| Health (new) | Hurt, Sick, Tired |
| Family | Father, Mother |
| People (new) | Friend, Teacher |
| Grammar | A, Am, An, And, Are, I, Is, Not, The, To, You |
| Choices | No, Yes |
| Food | Banana, Bread, Drink, Eat, Food, Milk, Rice, Water, test_pear; two legacy Eat/Drink records |
| Classroom Commands | Listen, Look, Read, Sit, Stand, Stop, Wait, Write |
| Daily Needs | Finished, Help, More, Rest, Sleep, Toilet, Want, Wash hands |
| Safety Words | Danger, Hot |
| Fixed gestures (reserved, hidden) | Help, I want to drink, I want to eat, I want to go to toilet, No, Sit down, Yes |
| No category | testnopic |

Food continues to cover eating, drinking, and meal vocabulary. Daily Needs covers requests and everyday routines. Health separates physical conditions from emotions; Family contains relatives, while People contains other familiar people. I and You belong with sentence-building vocabulary in Grammar; their existing subject roles remain intact.

The seven gestures intentionally stay in their reserved category under the current Guided 7 contract in `CLAUDE.md`. The meaning of `testnopic` cannot be inferred from its name or empty description, so it stays in No category. Empty Feelings, Needs, wow, and test category 2 records were preserved. No materials, categories, uploads, or saved activities were deleted.

The 17 moves are three polite words, three health words, two people, five grammar words, Yes/No, and the two legacy Eat/Drink records. Matching category tags were updated on the 15 built-in cards. Fourteen untouched generated descriptions were corrected; the teacher-edited Sick description was preserved. IDs, media URLs, sentence roles, grammar metadata, preparation profiles, collections, and activities are unchanged.

The original 50-card manifest now carries the reviewed categories while retaining its labels, assets, and sentence roles. The media importer and library defaults use those categories, including the existing `cat-choices` ID. Runtime loading continues to respect teachers' saved category selections. Content and Playground share the new category colors.

The exact data maintenance is recorded in [reclassify-learning-materials.sql](../supabase/maintenance/reclassify-learning-materials.sql). It updates only named records in their reviewed old categories and can be re-run without rewriting already-moved materials. Before/after snapshots are stored under Git-ignored `supabase/backups/20261026-material-categories-*.json` for recovery.

Verification: compared every saved material before/after, confirmed all 17 destinations and no unexpected field changes, and verified all existing category rows were preserved. Category regressions, the activity suite, Playground suite, TypeScript, lint, and production build were run. `npm run validate:materials` cannot complete in this checkout without `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; category and reference verification used the connected database instead. Activity tests independently cover PECS-over-gesture resolution and all no-text assets.

Run category regressions with `node --test scripts/test-material-categories.mjs`.
