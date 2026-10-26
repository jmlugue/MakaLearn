# MakaLearn codebase guide for thesis defense

This guide answers **“Which file implements that feature?”** and **“How does it work?”** using the current source code, reviewed on October 26, 2026. Open the linked file and search for the named function with Ctrl+F. Function names are used instead of line numbers so the guide stays useful when code moves.

This guide covers the whole application and gives a short starting point for panel questions. For Playground policy, saved decisions, quotas, and fallbacks, see [Playground checking and grammar materials](playground-checker.md).

## 1. Understand the folders first

| Location | Simple meaning | Example |
| --- | --- | --- |
| `src/app/` | Maps a website address to a page or server endpoint. | `content/page.tsx` opens `/content`; `api/activity-draft/route.ts` handles an AI request. |
| `src/features/` | Contains each feature's interface, state, and user actions. | `content/content-library-view.tsx` coordinates Content Library. |
| `src/components/` | Contains reusable layouts, buttons, dialogs, and other shared UI. | `layout/app-shell.tsx`, `ui/dialog.tsx`. |
| `src/lib/supabase/` | Reads and writes saved records, handles sessions, and uploads files. | `app-data.ts`, `media.ts`, `admin-guard.ts`. |
| `src/lib/` | Contains shared services and helpers. | `speech.ts`, `audit-logs.ts`, `sound-cues.ts`. |
| `src/utils/` | Contains calculation and rule logic used by features. | `pecs-sentence-validation.ts`, `gesture-model.ts`. |
| `src/types/` | Describes the shape of app data and database records. | `index.ts` for app models; `database.ts` for database fields. |
| `src/data/` | Contains built-in vocabulary and card metadata. | `pecs-card-manifest.ts`, `symbol-vocabulary.ts`; these are not the runtime database. |
| `public/` | Contains assets served directly by Next.js. | Logo, bundled gesture model, MediaPipe assets, and built-in word-free Activity pictures. |
| `supabase/` | Contains SQL migrations, seed data, policies, and audit queries. | `migrations/` records database changes. |
| `scripts/` | Contains automated checks and maintenance tools. | `test-activity-option-sets.mjs`, `validate-learning-materials.mjs`. |

The usual path is **page → feature → helper or API → Supabase**. Some features use local rules or a browser model instead of an API.

## 2. Quick feature-to-file map

| Panel asks about… | Website location | Open this first | Then follow… |
| --- | --- | --- | --- |
| Landing page | `/` | [app/page.tsx](../src/app/page.tsx) | [landing components](../src/components/landing/how-it-works-overlay.tsx). |
| Login and role redirect | `/login` | [login-panel.tsx](../src/features/auth/login-panel.tsx), `handleSubmit` | [use-auth-user.tsx](../src/features/auth/use-auth-user.tsx), `refreshProfile`. |
| Shared application setup | All pages | [layout.tsx](../src/app/layout.tsx) | [providers.tsx](../src/app/providers.tsx), `AppProviders`. |
| Sidebar, mobile menu, page access | Signed-in pages | [app-shell.tsx](../src/components/layout/app-shell.tsx), `AuthenticatedShell` | [nav-items.ts](../src/components/layout/nav-items.ts), [sidebar.tsx](../src/components/layout/sidebar.tsx), [mobile-nav.tsx](../src/components/layout/mobile-nav.tsx). |
| Learning materials | `/content` | [content-library-view.tsx](../src/features/content/content-library-view.tsx) | [materials-tab.tsx](../src/features/content/materials-tab.tsx), [card-form-dialog.tsx](../src/features/content/card-form-dialog.tsx), [card-detail-dialog.tsx](../src/features/content/card-detail-dialog.tsx). |
| Collections | Content → Collections | [lessons-tab.tsx](../src/features/content/lessons-tab.tsx) | [lesson-form-dialog.tsx](../src/features/content/lesson-form-dialog.tsx), `saveLesson` in the Content view. |
| Categories | Content → Categories | [categories-tab.tsx](../src/features/content/categories-tab.tsx) | [category-dialog.tsx](../src/features/content/category-dialog.tsx), `saveCategory` in the Content view. |
| Uploads and previews | Content → Media / material details | [media-tab.tsx](../src/features/content/media-tab.tsx) | [media-preview-dialog.tsx](../src/features/content/media-preview-dialog.tsx), [media.ts](../src/lib/supabase/media.ts). |
| Activity library and saving | `/activities` | [activities-view.tsx](../src/features/activities/activities-view.tsx) | [activity-library.tsx](../src/features/activities/activity-library.tsx), [activity-form-dialog.tsx](../src/features/activities/activity-form-dialog.tsx). |
| Teacher activity preview | Activities → Preview | [teacher-player.tsx](../src/features/activities/player/teacher-player.tsx) | `scoreActivity` in the Activities view; [activity-result.tsx](../src/features/activities/player/activity-result.tsx). |
| Student activity game | Student Mode → Activities | [student-activity-player.tsx](../src/features/activities/student-activity-player.tsx) | [student-game-parts.tsx](../src/features/activities/player/student-game-parts.tsx), [student-activity-menu.tsx](../src/features/activities/student-activity-menu.tsx). |
| Activity answer choices | All activity players | [player-utils.ts](../src/features/activities/player/player-utils.ts), `getActivityQuestionOptions` | [activity-option-sets.ts](../src/utils/activity-option-sets.ts), [activity-symbol-options.ts](../src/utils/activity-symbol-options.ts). |
| AI activity wording | Creator → Inspire me with AI | [api/activity-draft/route.ts](../src/app/api/activity-draft/route.ts), `POST` | [activity-ai-draft.ts](../src/utils/activity-ai-draft.ts), [activity-ai-rate-limit.ts](../src/utils/activity-ai-rate-limit.ts). |
| Picture sentence board | Student Mode → Playground | [playground-view.tsx](../src/features/playground/playground-view.tsx) | [playground-board.ts](../src/utils/playground-board.ts), [pecs-sentence-validation.ts](../src/utils/pecs-sentence-validation.ts). |
| MSAV preparation of new materials | Add material / Try preparing again | [api/playground-prepare/route.ts](../src/app/api/playground-prepare/route.ts), `POST` | [msav-material-profile.ts](../src/utils/msav-material-profile.ts). |
| Webcam and gesture practice | Student Mode → Gesture Practice | [gesture-practice-view.tsx](../src/features/gesture/gesture-practice-view.tsx) | [gesture-hand-tracker.ts](../src/utils/gesture-hand-tracker.ts), [gesture-model.ts](../src/utils/gesture-model.ts). |
| Corrective gesture feedback | Gesture Practice feedback | [gesture-feedback.ts](../src/utils/gesture-feedback.ts) | [api/gesture-feedback/route.ts](../src/app/api/gesture-feedback/route.ts). |
| Student Mode and Maki | Student Mode | [student-mode-context.tsx](../src/features/student-mode/student-mode-context.tsx) | [maki.tsx](../src/features/student-mode/maki.tsx), [maki-voice.ts](../src/features/student-mode/maki-voice.ts). |
| Admin accounts and oversight | `/admin` | [admin-panel-view.tsx](../src/features/admin/admin-panel-view.tsx) | [accounts-section.tsx](../src/features/admin/accounts-section.tsx), [content-section.tsx](../src/features/admin/content-section.tsx). |
| Usage charts | Admin → Home | [overview-section.tsx](../src/features/admin/overview-section.tsx), `ActivityUsage` | `fetchActivityPlays` in [app-data.ts](../src/lib/supabase/app-data.ts). |
| Audit history | Admin → Activity log | [activity-section.tsx](../src/features/admin/activity-section.tsx) | [audit-logs.ts](../src/lib/audit-logs.ts), `insertAuditLog`, `fetchAuditLogs`. |
| Accessibility and preferences | `/settings` | [settings-view.tsx](../src/features/settings/settings-view.tsx) | [user-settings-context.tsx](../src/features/settings/user-settings-context.tsx), [globals.css](../src/app/globals.css). |
| Profile details | `/profile` | [profile-view.tsx](../src/features/profile/profile-view.tsx) | `updateProfileDetails` in [app-data.ts](../src/lib/supabase/app-data.ts). |
| Spoken instructions and voice | Settings / Listen buttons | [speech.ts](../src/lib/speech.ts), `createUtterance` | [speech-text.ts](../src/utils/speech-text.ts), [sound-cues.ts](../src/lib/sound-cues.ts). |
| Help and guided tours | `/help` / Show me | [help-view.tsx](../src/features/help/help-view.tsx) | [help-content.ts](../src/features/help/help-content.ts), [guide-tour.tsx](../src/features/guide/guide-tour.tsx), [guide-content.ts](../src/features/guide/guide-content.ts). |

**Naming note:** The interface says **Collections**, while many component names, local variables, and the `Lesson` type alias still use “lesson.” The current adapters call `collections` and `collection_items`; these are views over the legacy backing tables. File names alone do not mean the old Lessons feature is a separate current module.

**Navigation note:** `/playground` and `/gesture-practice` are opened through Student Mode. `AuthenticatedShell` redirects users out of these routes when Student Mode is off. `/learners` is only a redirect to Content, not an active management page.

## 3. Follow the important workflows

### A. “How do users sign in, and how do you distinguish teachers from admins?”

1. [LoginPanel](../src/features/auth/login-panel.tsx) validates the form and calls `supabase.auth.signInWithPassword` in `handleSubmit`.
2. `getSignedInProfile` reads the saved profile. Inactive accounts are signed out.
3. The successful redirect opens `/admin` for an admin or `/content` for a teacher.
4. [AuthProvider](../src/features/auth/use-auth-user.tsx) shares the current account and refreshes its profile when Auth changes.
5. [AuthenticatedShell](../src/components/layout/app-shell.tsx) controls the signed-in layout and Student Mode route access.
6. Server account-management endpoints call [requireActiveAdmin](../src/lib/supabase/admin-guard.ts), which validates the Auth user and active admin profile. SQL policies and triggers also enforce database permissions.

Panel answer: **“Supabase authenticates the account, and the saved profile provides its role and status. The interface uses those values for navigation, while server checks and database rules enforce permissions.”** Hiding an Admin menu item is only a UI measure.

[middleware.ts](../middleware.ts) delegates to [updateSession](../src/lib/supabase/middleware.ts) to refresh session cookies; it is not the feature's complete authorization logic. Public signup/account requests are retired; administrators create accounts directly.

### B. “Where does a new learning material go?”

1. [card-form-dialog.tsx](../src/features/content/card-form-dialog.tsx) collects the material's fields and selected files.
2. `addCard` in [ContentLibraryView](../src/features/content/content-library-view.tsx) creates the record through `insertLearningItem`.
3. `uploadToItem` calls [uploadMediaAssetToSupabase](../src/lib/supabase/media.ts), which validates the upload, stores the file, and inserts its `media_assets` record.
4. `updateLearningItemMedia` in [app-data.ts](../src/lib/supabase/app-data.ts) connects the media URL to the learning item.
5. For new PECS cards, `requestPlaygroundPreparation` calls `/api/playground-prepare` to prepare the card for sentence validation.

Panel answer: **“Material details are saved in `learning_items`; uploaded files are stored in Supabase Storage, with file metadata in `media_assets`.”** Follow `confirmDeleteItem` and `deleteLearningItem` for the confirmed deletion flow and optional removal of associated media.

Two images serve different purposes: `symbolImageUrl` is the standard card picture for Content/Playground; `activityImageUrl` is the separate word-free Activity picture. A card can be ready for one feature while still missing requirements for the other. Audio is optional.

### C. “How do Collections connect to Activities?”

Open `saveLesson` in [ContentLibraryView](../src/features/content/content-library-view.tsx), then `insertCollection` / `updateCollection` in [app-data.ts](../src/lib/supabase/app-data.ts). A Collection saves teaching information and an ordered set of material IDs. It does not automatically create an Activity.

The Activity creator can select a Collection and use its cards. [lesson-activity.ts](../src/utils/lesson-activity.ts) contains `newLessonActivityId`, `findActivityLesson`, and compatibility rules for older saved links. `canSee` handles UI visibility for shared/private records. Some reads are deliberately broader than the UI list, so do not describe this filter as a database privacy guarantee.

### D. “How are activities created and their choices selected?”

1. [ActivityFormDialog](../src/features/activities/activity-form-dialog.tsx) collects the type, selected correct-answer materials, and editable wording.
2. `saveActivity` in [ActivitiesView](../src/features/activities/activities-view.tsx) uses `createActivityQuestions` in [app-data.ts](../src/lib/supabase/app-data.ts).
3. [activity-records.ts](../src/lib/supabase/activity-records.ts) saves the activity and its questions into `activities` and `activity_items`.
4. At load time, `normalizeActivitySymbolQuestions` in [activity-symbol-options.ts](../src/utils/activity-symbol-options.ts) resolves legacy material values against current eligible PECS materials.
5. At play time, `getActivityQuestionOptions` in [player-utils.ts](../src/features/activities/player/player-utils.ts) rebuilds choices from eligible PECS materials across the library.
6. `buildActivityOptionSets` in [activity-option-sets.ts](../src/utils/activity-option-sets.ts) varies choices using a shuffle seed, removes duplicates, and applies semantic exclusions.
7. [player-parts.tsx](../src/features/activities/player/player-parts.tsx) and the other player components render the pictures. Built-in option art is in `public/pecs/generated_cards_no_text`; new materials use their dedicated `activity_image_url`.

Panel answer: **“The selected cards define the correct answers. Distractors come from the eligible PECS library, and rules exclude cards that could also reasonably answer the question. Choices are randomized and use pictures without printed answer labels.”** Saved option arrays are legacy input that must be rechecked, not blindly displayed.

The current creator offers **Match word to symbol, Fill in the blank, and Drag and drop symbol cards**. See `activityTypes` and `retiredActivityTypes` in [activity-helpers.ts](../src/features/activities/activity-helpers.ts). Gesture activities, Choose the word, and Choose the picture remain legacy types; Gesture Practice is a separate feature.

### E. “Where is the score calculated, and is it saved?”

| Context | Calculation / event | Persistence |
| --- | --- | --- |
| Teacher preview | `scoreActivity` in [activities-view.tsx](../src/features/activities/activities-view.tsx) compares selected values to question answers; percentage is `round(correct / total × 100)`. | The score remains in component state. |
| Student game | `pick`, `drop`, and the `scored` map in [student-activity-player.tsx](../src/features/activities/student-activity-player.tsx) track outcomes. Correct answers within the allowed three tries count; this is not a first-try-only assessment. | The completion effect calls `onFinish` once per mounted round. |
| Completed Student round | `recordPlay` in the Activities view forwards counts and duration to `insertActivityPlay`. | For teachers, saves one `activity_results` row with score/counts and `answers.source = "student-mode"`. Admin plays are excluded. |
| Admin usage | `fetchActivityPlays` reads marked Student rounds; `ActivityUsage` in [overview-section.tsx](../src/features/admin/overview-section.tsx) groups them. | Reads saved records for play totals, time, type mix, and most-played activities. |
| Gesture practice | Guided/free recognition feedback and progress live in [gesture-practice-view.tsx](../src/features/gesture/gesture-practice-view.tsx). | Gesture attempts are never saved. |

Panel answer: **“Teacher preview scores are temporary. Completed Student Mode rounds played by teachers are saved for activity usage reporting. Gesture practice stays session-only, and the current system has no individual learner progress records.”**

### F. “How does the Playground check a sentence?”

1. [PlaygroundView](../src/features/playground/playground-view.tsx) loads PECS materials and filters them using `isPlaygroundReady` from [msav-material-profile.ts](../src/utils/msav-material-profile.ts).
2. `addCard`, `placeLibraryCard`, and drag handlers manage the ordered board. [playground-board.ts](../src/utils/playground-board.ts) supplies `placeLibraryItem`. Current board drops append to the next empty place; they do not reorder placed cards.
3. `checkSentence` calls [checkPlayground](../src/utils/check-playground.ts), which requests an authenticated [Playground grammar decision](../src/app/api/playground-check/route.ts) using card IDs. The server resolves current labels and reads a saved judgment or asks Gemini about the ordered text.
4. AI evaluates English grammar without card roles. If no AI decision is available, [validatePecsSentence](../src/utils/pecs-sentence-validation.ts) applies local MSAV roles, ordering, agreement, and meaning rules. Both paths use fixed local feedback.
5. The UI shows success/retry feedback and uses shared speech helpers to read the message.

Panel answer: **“Playground checks standard English with AI and reuses saved positive and negative decisions. Card roles are used by the local MSAV fallback if AI is unavailable.”** An uncached fallback result can differ from a later AI result. Explicit algorithm mode bypasses both AI and its saved decisions. See [Playground checking](playground-checker.md) for configuration, cache, quota, and correction details.

For a new non-manifest card, [playground-prepare/route.ts](../src/app/api/playground-prepare/route.ts) asks Gemini to classify its text into existing roles/traits. `parseMsavMaterialProfile` validates that output before it is saved. This preparation does not change the validator's rules. Built-in cards bypass material classification; their uncached sentences still use AI grammar checking. New cards need a prepared profile and a public standard card picture; pending/unsupported cards stay out of the picker. Failed preparation requires a teacher retry, with a cooldown.

### G. “Where is the actual gesture recognition?”

1. `startCamera` in [GesturePracticeView](../src/features/gesture/gesture-practice-view.tsx) requests the webcam and starts tracking; `stopCamera` releases it.
2. [loadGestureHandTracker](../src/utils/gesture-hand-tracker.ts) loads MediaPipe. `runHandTracking` reads camera frames and extracts/draws hand landmarks.
3. [gesture-model.ts](../src/utils/gesture-model.ts) normalizes landmarks and uses `predictMakaLearnGesture` to run the bundled trained model in the browser. The sequence is resized to 64 frames with 126 values per frame: two hands × 21 points × three coordinates.
4. Weights come from [cnn-weights.json](../public/models/makalearn-gesture/cnn-weights.json). The local TensorFlow.js code runs the trained convolutional network and maps its seven outputs to practice labels.
5. [gesture-capture-state.ts](../src/utils/gesture-capture-state.ts), [gesture-stability.ts](../src/utils/gesture-stability.ts), and [gesture-shape-safety.ts](../src/utils/gesture-shape-safety.ts) help reject unstable or unsuitable captures.
6. `processCompletedGestureCapture` turns the result into feedback and session progress. [guided-gesture-session.ts](../src/utils/guided-gesture-session.ts) supplies guided-session helpers.

Panel answer: **“MediaPipe locates the hand points; our trained local gesture model classifies the landmark sequence. Additional local checks stabilize the result. Gemini supplies optional corrective wording after recognition.”**

The seven labels are Toilet, Eat, Drink, Help, Yes, No, and Sit down, with expanded display wording for some labels. Additional gesture records in Content do not retrain the model or add output classes. This repository contains runtime inference; do not claim that saving a gesture trains it. The recognizer and media are prototype material, not official Makaton content or a clinically validated assessment.

### H. “What does Gemini do, and what if it fails?”

| Use | Server endpoint | Main helper | What remains local |
| --- | --- | --- | --- |
| Corrective gesture wording | [gesture-feedback/route.ts](../src/app/api/gesture-feedback/route.ts) | [gesture-feedback.ts](../src/utils/gesture-feedback.ts): `buildGestureFeedbackRequest`, `createTemplateGestureFeedback`, `validateGeminiGestureFeedback`. | Camera processing and gesture classification. The request uses structured recognition information, not webcam frames. |
| Editable Activity wording | [activity-draft/route.ts](../src/app/api/activity-draft/route.ts) | [activity-ai-draft.ts](../src/utils/activity-ai-draft.ts): `buildPromptDraftRequest`, `validateAiActivityPrompt`, `completeActivityPromptSuggestions`. | Answer-choice eligibility, distractor rules, scoring, and the teacher's final review. |
| New PECS material preparation | [playground-prepare/route.ts](../src/app/api/playground-prepare/route.ts) | [msav-material-profile.ts](../src/utils/msav-material-profile.ts): `buildMsavClassificationPrompt`, `parseMsavMaterialProfile`. | Profile validation and the fallback sentence rules. |
| Standard-English Playground grading | [playground-check/route.ts](../src/app/api/playground-check/route.ts) | [playground-provider.ts](../src/lib/playground-provider.ts): `gradePlaygroundText`; [playground-grading.ts](../src/utils/playground-grading.ts): `parsePlaygroundDecision`, `playgroundDecisionResult`. | Fixed visible feedback, board controls, and local MSAV fallback. |

Activity drafting uses saved cache/quota records (`activity_prompt_generations`, `ai_usage_events`) and checked question-bank fallback text where available. [question-bank/index.ts](../src/utils/question-bank/index.ts) exposes the bank; [question-bank/rules.ts](../src/utils/question-bank/rules.ts) checks wording. Gesture feedback falls back to fixed templates. New-material preparation remains pending or unsupported if it cannot produce a usable profile; it does not silently approve the card.

Panel answer: **“Gemini assists with wording, material preparation, and standard-English sentence grading. The app validates its outputs. Local code controls activity scoring, gesture recognition, visible feedback, and the sentence-checking fallback.”** See [Playground checking](playground-checker.md) for that feature's keys, quotas, saved decisions, and outage behavior. Other prompts and provider controls are in the linked routes and helpers.

### I. “How are accounts managed and protected?”

The interface is [accounts-section.tsx](../src/features/admin/accounts-section.tsx). Server actions are separate endpoints:

| Action | Endpoint implementation |
| --- | --- |
| Create an account | [api/admin/create-teacher/route.ts](../src/app/api/admin/create-teacher/route.ts). |
| Activate/deactivate | [api/admin/account-status/route.ts](../src/app/api/admin/account-status/route.ts). |
| Change role | [api/admin/change-role/route.ts](../src/app/api/admin/change-role/route.ts). |
| Reset password | [api/admin/reset-password/route.ts](../src/app/api/admin/reset-password/route.ts). |

Each uses [admin-guard.ts](../src/lib/supabase/admin-guard.ts). `isLastActiveAdmin` helps prevent removal of the last active administrator through role/status changes. [server.ts](../src/lib/supabase/server.ts) separates a signed-in server client from the privileged service-role client. The service-role key belongs on the server.

To show database enforcement, open the authorization and collaborative-content migrations: [account authorization](../supabase/migrations/20260925094859_account_authorization_hardening.sql), [teacher content rules](../supabase/migrations/20260925094204_collaborative_teacher_content.sql), and later relevant migrations. Explain RLS as **“database rules that decide which rows an account can read or change.”** Admin account oversight does not mean admins author teaching content; Content/Activity authoring is teacher-only in the current app.

### J. “Where are accessibility, speech, and responsive layouts?”

[SettingsView](../src/features/settings/settings-view.tsx) presents controls. [UserSettingsProvider](../src/features/settings/user-settings-context.tsx) loads saved preferences and applies text-size, contrast, and reduced-motion classes. [globals.css](../src/app/globals.css) defines their visual effects. [speech.ts](../src/lib/speech.ts) supplies the shared browser voice and speed; uploaded audio files remain separate media.

Some device preferences, such as voice/speed and extra-large text, and a tour-dismissal fallback use `localStorage`. This is distinct from app records, AI caches/quotas, and activity results stored in Supabase. Student Mode and unsaved practice state use React state.

For phone/tablet behavior, open [tailwind.config.ts](../tailwind.config.ts), [app-shell.tsx](../src/components/layout/app-shell.tsx), and [mobile-nav.tsx](../src/components/layout/mobile-nav.tsx). Breakpoints are mobile below 768px, tablet from 768px, and desktop from 1025px. Individual feature components use responsive Tailwind classes. [STYLE_GUIDE.md](../STYLE_GUIDE.md) records the UI conventions.

## 4. Where the saved data lives

Open [types/index.ts](../src/types/index.ts) to explain the app's models, [types/database.ts](../src/types/database.ts) for database field names, and [app-data.ts](../src/lib/supabase/app-data.ts) for mapping/query functions.

| Data | Database location / storage | Main code entry |
| --- | --- | --- |
| Credentials and sessions | Supabase Auth | `LoginPanel`, `AuthProvider`, `updateSession`. |
| App role, name, status | `profiles` | `refreshProfile`, `requireActiveAdmin`. |
| Teaching materials / readiness | `learning_items` | `mapLearningItem`, `insertLearningItem`, `updateLearningItemDetails`. |
| Categories | `categories` | `insertCategory`, `updateCategoryDetails`, `deleteCategory`. |
| Collections and ordered cards | `collections`, `collection_items` API views; legacy `lessons`, `lesson_items` backing tables | `insertCollection`, `updateCollection`, `deleteCollection`. |
| Activities and questions | `activities`, `activity_items` | [activity-records.ts](../src/lib/supabase/activity-records.ts). |
| Reusable teacher question wording | `activity_prompt_templates` | `fetchActivityPromptTemplates`, `upsertActivityPromptTemplates`. |
| Completed Student plays | `activity_results` | `insertActivityPlay`, `fetchActivityPlays`. |
| Upload metadata / actual files | `media_assets` / Supabase Storage buckets | `uploadMediaAssetToSupabase`, `deleteMediaAssetFromSupabase`. |
| Account preferences | `user_settings` | `fetchUserSettings`, `upsertUserSettings`. |
| Administrative history | `audit_logs` | `insertAuditLog`, `fetchAuditLogs`. |
| AI draft cache / usage | `activity_prompt_generations`, `ai_usage_events` | `/api/activity-draft`; preparation also records AI usage. |
| Playground grades / request coordination / corrections | `playground_check_decisions`, `playground_check_requests`, `playground_check_corrections` | [playground-store.ts](../src/lib/playground-store.ts), [playground-checker.ts](../src/lib/playground-checker.ts); see [feature documentation](playground-checker.md). |

[migrations/](../supabase/migrations/) records schema/policy evolution. [seed.sql](../supabase/seed.sql) holds development seed material. The historical [schema.sql](../supabase/schema.sql) is not a verified current empty-project bootstrap. See the [Supabase readiness audit](supabase-readiness-audit.md) for compatibility and setup limits. These local files explain implementation; they do not prove the current hosted deployment matches this checkout.

## 5. Evidence to show when asked “How did you test it?”

Commands are defined in [package.json](../package.json). Read each suite for the exact cases it checks; passing tests establish those cases, not real-world educational effectiveness.

| Area | Command / evidence |
| --- | --- |
| Activity choices, wording, and quotas | `npm run test:activities`; especially [test-activity-option-sets.mjs](../scripts/test-activity-option-sets.mjs) for PECS/gesture resolution and word-free asset coverage. |
| Sentence rules, AI checker/cache/fallback, board placement, prepared profiles | `npm run test:playground`. |
| Gesture capture and stability | `npm run test:gesture-capture`, `npm run test:gesture-stability`. |
| Feedback rules and mocked route behavior | `npm run test:feedback` (read its options before enabling a live provider call). |
| Auth guard regressions | `npm run test:auth`. |
| Speech text / upload names | `npm run test:audio`, `npm run test:media`. |
| Material/media consistency | `npm run validate:materials` (can read the configured Supabase project). |
| Type and framework checks | `npx tsc --noEmit`, `npm run lint`, `npm run build`. |
| Database integration | `test:activities:db`, `test:app:db`, `test:readiness:db`, `test:auth:live`; inspect the scripts first because these require configured test accounts and may create temporary records. |

Do not run a production build while a development server is using the same `.next` folder. Start the development server manually when needed. Camera quality, real touch devices, and classroom usefulness require separate hands-on evaluation.

## 6. A short route through the code during the defense

1. Open [app/content/page.tsx](../src/app/content/page.tsx) to show that a route mounts a feature inside the shared shell.
2. Open [ContentLibraryView](../src/features/content/content-library-view.tsx), search `addCard`, and follow `insertLearningItem` into [app-data.ts](../src/lib/supabase/app-data.ts).
3. Show [ActivitiesView](../src/features/activities/activities-view.tsx), search `scoreActivity` and `recordPlay`, and explain temporary preview versus saved Student rounds.
4. Open [checkPlayground](../src/utils/check-playground.ts) for the primary AI decision path and [validatePecsSentence](../src/utils/pecs-sentence-validation.ts) for fallback order and meaning rules.
5. Open [gesture-hand-tracker.ts](../src/utils/gesture-hand-tracker.ts) and [gesture-model.ts](../src/utils/gesture-model.ts) to show tracking versus classification.
6. Open one [AI route](../src/app/api/gesture-feedback/route.ts) to show server-side generation and fallback checks.
7. Open [admin-guard.ts](../src/lib/supabase/admin-guard.ts) and an authorization migration to show enforcement beyond menu visibility.

Keep these scope distinctions accurate: there is no active Learners page or learner login, no saved gesture attempts, and no automatic retraining from uploaded gestures. Playground grading is AI-first with persistent decisions and a local fallback; material preparation is a separate AI workflow. The learning content and recognition are prototype resources rather than official Makaton materials or clinical assessment tools.
