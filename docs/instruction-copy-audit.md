# Instruction wording check

Checked the app's source text and all four Gemini prompts on October 26, 2026.

## App instructions

- Simplified the three Add material hints from PR #22.
- Replaced four em dashes in gesture recording and countdown messages with short sentences.
- Replaced a semicolon in the activity draft status message with a period.
- Checked the remaining UI instructions, Help text, guide text, and local feedback templates for both punctuation marks.

HTML entities such as `&amp;` use a semicolon in source code. They display a character such as `&`, so they were kept. JavaScript statement endings were also kept. This check does not rewrite teacher-authored records stored in the database.

## Gemini corrective feedback

The previous prompt banned semicolons only in `teacherNote`. It did not explicitly ban em dashes.

The prompt now requires short, direct sentences and familiar words in both `learnerMessage` and `teacherNote`. It explicitly bans semicolons and em dashes. The teacher note should explain the result and give one clear next step.

Generated teacher notes containing either punctuation mark are rejected. The route returns its existing local feedback instead. Learner messages remain fixed local text. No new provider call or retry is added.

## Other Gemini prompts

- Activity drafting explicitly bans semicolons and em dashes in generated questions and sentences. Validation rejects those outputs and keeps the existing local fallback. Cached suggestions pass through the same validation, so the cache version does not need to change.
- Material classification uses simple sentences in its instructions. Its output remains structured classification data rather than visible feedback prose.
- Playground grading examples use periods instead of semicolons. The grading policy, saved decisions, and fixed local feedback remain unchanged.

## Verification

Run `node --test scripts/test-instruction-copy.mjs` for the source text check. Feedback tests cover the actual request prompt and fallback after unsuitable provider punctuation. Activity draft tests cover both punctuation marks and valid wording with commas and periods. Run the existing activity, Playground, gesture, TypeScript, lint, and build checks before handoff.

This change does not include the concurrent reliability work on authentication, quotas, data loading, or forms. Provider tests use mocked responses rather than live Gemini requests.
