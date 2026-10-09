# Phase 2c: MSAV Algorithm Development

## Important alignment note before insertion into the manuscript

The implemented MSAV Algorithm is the rule-based PECS/AAC symbol-arrangement validator used by the MakaLearn Playground. It is separate from the MediaPipe and CNN gesture-recognition pipeline reported in Phase 2b. The final implementation also does not reproduce all five sentence structures proposed in the methodology word for word. It retains the intended rule-based, explainable validation approach but was refined around the actual 50-card PECS/AAC vocabulary and the functional communication combinations supported by MakaLearn.

The Results and Discussion should therefore report the current implementation honestly. In particular:

- `I + Eat + Food` and `I + Sit` are supported by the current algorithm.
- The planned four-card pattern `I + Want + Drink + Water` is not supported. The implemented request form is `I + Want + Water`.
- The planned example `Food + Is + Hot` is not supported because `Food` is mapped as an object, while the current describing-sentence rule requires a recognized subject with the correct form of *be*, such as `I + Am + Happy`.
- The planned `I + Go + There` pattern cannot be claimed because *Go* and *There* are not included in the current 50-card manifest and no adverb role exists in the implemented role type.

These differences should be described as refinement based on the final symbol inventory, not hidden as if all proposed rules were implemented unchanged.

---

## Copy-ready Results and Discussion text

### Phase 2c: MSAV Algorithm Development

Phase 2c produced the current version of the Makaton Symbol Arrangement and Validation (MSAV) Algorithm used in the MakaLearn Playground. The resulting component is a deterministic, rule-based validator for PECS/AAC card arrangements. It does not use machine learning, natural-language generation, or the gesture-recognition model. Instead, it receives an ordered group of symbol cards, confirms that the cards belong to the active learning-material library, reads the sentence role assigned to each card, applies order and semantic compatibility rules, and returns either a valid result or a short corrective prompt. This design retained the study's requirement for an explainable validation method while allowing the rules to be inspected and revised directly.

#### Final Symbol Inventory and Role Mapping

The final built-in symbol inventory contained 50 PECS/AAC cards distributed across seven classroom-facing categories: Greetings, Emotions, Family, Food, Classroom Commands, Daily Needs, and Safety Words. For validation, the same cards were mapped to ten sentence roles. The role mapping contained six subjects, seven verbs, eight objects, six emotions, seven commands, four greetings, four responses, two polite words, three forms of the verb *be*, and three safety words. The separation between a card's display category and its sentence role was necessary because the display category helps the learner find a card, whereas the sentence role supplies the information used by the MSAV rules.

**Table 6. Final MSAV Symbol-Role Inventory**

| Sentence role | Number of cards | Examples from the implemented library |
|---|---:|---|
| Subject | 6 | I, You, Mother, Father, Teacher, Friend |
| Verb | 7 | Eat, Drink, Read, Write, Sleep, Wash hands, Want |
| Object | 8 | Food, Water, Rice, Bread, Milk, Banana, Toilet, Rest |
| Emotion | 6 | Happy, Sad, Angry, Scared, Tired, Sick |
| Command | 7 | Sit, Stand, Listen, Look, Read, Write, Wait |
| Greeting | 4 | Hello, Goodbye, Good morning, Sorry |
| Response | 4 | More, Finished, Yes, No |
| Polite word | 2 | Thank you, Please |
| Be verb | 3 | Am, Is, Are |
| Safety word | 3 | Danger, Hot, Hurt |
| **Total** | **50** | **50 cards in the implemented manifest** |

The role inventory became the first validation layer. Cards without an assigned sentence role cannot form a multi-card construction, and a card that is not part of the approved runtime library is rejected. MakaLearn also limits an arrangement to five cards. These conditions prevent the algorithm from validating unknown cards or an arrangement beyond the size supported by the Playground interface.

#### Development of the Final Rule Set

The MSAV Algorithm was developed iteratively. The first implementation, added on June 26, 2026, compared the sequence of card roles with a small list of accepted patterns and already checked empty input, the five-card limit, library membership, and missing role information. A succeeding revision allowed a single symbol to stand on its own because AAC communication can be meaningful at the word or expression level. Context-sensitive handling was then introduced for cards whose function depends on their position, together with semantic checks for combinations involving *Eat*, *Drink*, and *Help*.

The largest refinement was completed on September 21, 2026. The validator was changed from broad role-sequence matching to explicit construction rules that check both grammatical position and meaning. Subject-verb agreement was added for *Am*, *Is*, and *Are*; base-form action cards were limited to the subjects *I* and *You*; food and beverage targets were separated; self-directed combinations such as `I + Help + I` were rejected; and rules were added for greetings, named addressees, polite commands, compact requests, quantity phrases, and combined greeting-sentence constructions. Later refinements rejected *Am*, *Is*, and *Are* when used alone and simplified the learner-facing success message to either “You made a sentence” or “You made a phrase.”

This history shows that the final MSAV version was not produced from one fixed list of category sequences. It was refined through observed false positives and learner-facing interaction requirements. The most important change was the introduction of semantic compatibility checking. A role-only rule could incorrectly accept `I + Eat + Water` because *Water* is an object. The implemented rule rejects that arrangement and tells the learner to use a food card after *Eat*. Similarly, `Drink + Banana` is rejected because *Banana* is not in the beverage set, and `Help + Food` is rejected because *Help* requires a person as its target. These checks reduce cases that are structurally plausible but communicatively incorrect.

#### Supported Symbol Constructions

The final algorithm recognizes single-card communication and 13 named multi-card construction types. These constructions are summarized in Table 7. The examples shown are reproducible with the current card inventory.

**Table 7. Implemented MSAV Construction Rules**

| Implemented construction | Main validation condition | Example accepted by the current algorithm |
|---|---|---|
| Single Card | One recognized card, except a stand-alone be verb | Water |
| Addressed Expression | Greeting, response, or polite expression followed by a named person | Hello + Mother |
| Common Expression | Exact approved compact expression | No + Thank you |
| Describing Sentence | Subject + matching be verb + emotion or approved state | I + Am + Happy |
| Basic Request | I/You + Want + approved object, More, or Help | I + Want + Water |
| Action Sentence | I/You + compatible action + compatible target | I + Eat + Food |
| Intransitive Action | I/You + action or command that can stand without a target | I + Sit |
| Polite Command | Please before an action, or after an action-target pair | Please + Drink + Water |
| Simple Command | Action followed by a semantically compatible target | Eat + Banana |
| Polite Request | Action or approved need followed by Please | Water + Please |
| Quantity Phrase | More followed by food, drink, Rest, or Help | More + Food |
| Describing Phrase | Hot followed by a food or drink target | Hot + Milk |
| Greeting with Sentence | Greeting, optionally a named person, followed by a valid sentence | Hello + Mother + I + Am + Happy |
| Addressed Sentence | Named person followed by a valid sentence | Teacher + I + Want + Help |

The implemented rules deliberately distinguish complete sentences from functional phrases, words, and expressions. Forty-seven of the 50 one-card inputs are accepted as meaningful stand-alone communication; the three rejected one-card inputs are *Am*, *Is*, and *Are*, because these require a subject and complement. This decision reflects the use of symbols for functional AAC communication rather than requiring every accepted arrangement to be a complete written-English sentence.

#### MSAV Validation Results

The current MSAV test suite contains ten named validation test groups and three board-interaction test groups. When `npm run test:playground` was run on October 5, 2026, all 13 test groups passed, with no failed, skipped, or cancelled tests. The validation tests covered addressed expressions, subject-verb agreement, subject restrictions for base-form actions, requests, semantic action-target compatibility, compact phrases, greeting-led sentences, every one-card input, owner-specified acceptance cases, and every ordered two-card combination in the 50-card manifest. Because the two-card audit checks all 50 × 50 ordered pairs, it evaluates 2,500 possible arrangements against an independently constructed list of approved pairs rather than testing only a few examples.

The exhaustive two-card audit produced 125 accepted arrangements and 2,375 rejected arrangements. The accepted set consisted of addressed expressions, polite commands and requests, intransitive actions, compatible action-target commands, common expressions, quantity phrases, and describing phrases. The large rejected set is expected because most arbitrary pairs of symbols do not form an approved functional construction. The important result is not a high acceptance rate; it is exact agreement between the algorithm and the approved-pair specification for all 2,500 ordered pairs.

**Table 8. Automated MSAV and Playground Test Results**

| Validation area | Evidence exercised by the automated tests | Result |
|---|---|---|
| Addressed expressions | Eight lead expressions combined with four named people, with invalid order and target checks | Passed |
| Subject-verb agreement | Six subjects, three be verbs, and nine valid complements | Passed |
| Base-form action restriction | Actions accepted after I/You and rejected after named people | Passed |
| Basic requests | Approved request targets plus incomplete and incompatible requests | Passed |
| Semantic action-target rules | Eat/food, Drink/beverage, and Help/person combinations, including negative cases | Passed |
| Compact functional phrases | More, Hot, Please, Yes, No, and Thank you combinations | Passed |
| Combined constructions | Greeting-led and person-addressed sentences | Passed |
| Exhaustive two-card audit | All 2,500 ordered pairs in the 50-card manifest | Passed |
| Single-card audit | All 50 cards; only Am, Is, and Are rejected alone | Passed |
| Owner-specified cases | Ten representative accepted and rejected arrangements | Passed |
| Board interaction | Card placement, replacement, limit handling, and ordering utility behavior | Passed |
| **Overall command result** | **13 named test groups** | **13 passed; 0 failed** |

Representative results from the current implementation are shown in Table 9. These cases demonstrate that MSAV checks more than card category order. It also verifies subject agreement, required parts, and the semantic relationship between an action and its target.

**Table 9. Representative Current MSAV Validation Cases**

| Symbol arrangement | Actual result | Returned pattern or feedback | Interpretation |
|---|---|---|---|
| I + Eat + Food | Valid | Action Sentence | Compatible subject, action, and food target |
| I + Want + Water | Valid | Basic Request | Implemented three-card request form |
| I + Sit | Valid | Intransitive Action | Action can stand without an object |
| I + Am + Happy | Valid | Describing Sentence | Correct subject-verb agreement and complement |
| Hello + Mother | Valid | Addressed Expression | Approved expression followed by a named person |
| Please + Drink + Water | Valid | Polite Command | Compatible action-target pair with Please |
| More + Food | Valid | Quantity Phrase | Approved functional phrase |
| Food + Eat + I | Invalid | Try again | Incorrect order and incompatible construction |
| Want + Drink + Water | Invalid | Try again | Missing supported subject-led request structure |
| I + Want + Drink | Invalid | Try a thing, More, or Help after Want | Verb used where an approved request target is required |
| I + Food | Invalid | Try again | Unsupported subject-object pair |
| I + Eat + Water | Invalid | Try a food card after Eat | Object role is present, but the target is semantically incompatible |
| Food + Is + Hot | Invalid | Try again | Food is not a supported grammatical subject in the implemented mapping |
| I + Want + Drink + Water | Invalid | Try again | Planned four-card form was replaced by the implemented three-card request form |
| Hello + Mother + I + Am + Happy | Valid | Greeting with Sentence | Five-card combined construction within the interface limit |

#### Integration into the MakaLearn Playground

The MSAV Algorithm was integrated into the learner-facing Playground rather than left as an isolated function. The Playground loads PECS learning items from Supabase, retains only records with an embeddable symbol image, attaches sentence-role metadata from the database or the built-in manifest, and constructs the active set of approved card identifiers. When the learner presses **Check**, the ordered board cards and the active approved-ID set are passed to the validator. A valid result opens the “GOOD JOB” response, plays the positive cue, and reads the validated arrangement aloud. An invalid result opens the “TRY AGAIN” response and displays either a rule-specific prompt or the general try-again message. The same validator is also consulted by the **Listen** action so a valid arrangement can be spoken as a continuous sentence, while an invalid arrangement is read card by card.

This integration supports the teacher-guided purpose of MakaLearn. The validator provides an immediate and consistent result, while the teacher remains responsible for explaining the communication context and deciding whether the selected symbols are appropriate for the learner. The approach is also suitable for the web application because the validation is local and deterministic: the same ordered cards produce the same result without waiting for an external AI service.

#### Discussion of the Final MSAV Version

The principal result of Phase 2c was an explainable symbol-validation component grounded in the final MakaLearn vocabulary. The implementation supports the study's objective of interactive symbol learning by allowing learners to arrange, check, hear, clear, and try symbol combinations again. Its rule-based structure is consistent with the rationale already presented in the methodology: symbol arrangements benefit from explicit category mapping, while rule-based checking is appropriate when valid and invalid patterns must be explained and repeatedly tested (Zohoorian et al., 2021; Bryant et al., 2023).

The development process also demonstrated why category order alone was insufficient. Early broad patterns could accept combinations that had the correct role sequence but the wrong meaning. The final semantic sets for edible items, beverages, request targets, named people, and describing complements reduced these false positives. Subject-verb agreement and self-reference checks further narrowed the accepted set. Consequently, the algorithm's correctness is supported not merely by examples that passed, but by systematic negative testing intended to show that unsupported arrangements are rejected.

The current results should nevertheless be interpreted within the algorithm's scope. First, passing 13 automated test groups is evidence of conformance to the implemented rules; it is not a statistical measure of linguistic accuracy or learning effectiveness. Second, the exhaustive audit covers every one-card and two-card input, while longer arrangements are covered by targeted rule tests rather than a complete enumeration of all possible three- to five-card sequences. Third, the vocabulary is finite and English-only. New teacher-created cards require accurate sentence-role metadata; otherwise, the Playground's current fallback treats an unmapped card as an object, which may prevent or incorrectly shape some constructions. Fourth, the algorithm accepts functional AAC words, phrases, and expressions in addition to complete sentences. This is intentional for communication support, but the result should not be described as a general English grammar checker.

Finally, the implemented rule set differs from the five generic Basic Sentence Structure Rules originally proposed. The final vocabulary and classroom-oriented interaction led to a more specific functional rule set. BSR1 and BSR3 are represented by the implemented Action Sentence and Intransitive Action rules. However, BSR2 was simplified from `I + Want + Drink + Water` to `I + Want + Water`; BSR4 was replaced by subject-agreement constructions such as `I + Am + Happy`; and BSR5 was not implemented because the current card inventory contains neither *Go* nor *There* and does not define an adverb role. This is a design refinement that should be reflected in the methodology and readiness criteria. The final MSAV should be evaluated against the rules that are actually present in the system, not against patterns that the current code and vocabulary do not support.

#### Final MSAV Readiness Assessment

Based on the implemented functionality and automated results, the current MSAV Algorithm is ready for its defined role in the MakaLearn Playground, subject to the documented scope limitations.

**Table 10. Evidence-Based MSAV Readiness Checklist**

| Readiness criterion | Evidence from the current system | Result |
|---|---|---|
| Final symbol inventory is defined | 50-card manifest across seven learner-facing categories | Completed |
| Symbols have validation roles | All 50 manifest cards mapped to one of ten sentence roles | Completed |
| Library membership and length are checked | Unknown cards rejected; board limited to five cards | Completed |
| Order and required parts are checked | Explicit construction rules and incomplete-pattern tests | Passed |
| Semantic compatibility is checked | Food, beverage, person, request-target, and complement constraints | Passed |
| Valid and invalid examples are tested | Ten validation test groups, including positive and negative cases | Passed |
| Complete two-card input space is checked | 2,500 ordered pairs evaluated against the approved-pair specification | Passed |
| Playground integration is working in code | Check, success/retry response, and speech paths call the validator | Completed |
| Original five BSRs are implemented unchanged | Three proposed forms are revised, unsupported, or absent | **Not met as originally written; methodology must be updated** |

The readiness result is therefore conditional but clear: the implemented functional MSAV rule set is verified and integrated, whereas the original statement that all five proposed BSRs were completed would not be supported by the present system. Updating the manuscript to distinguish the proposed rule set from the final implemented rule set will make the Phase 2c results reproducible and consistent with the deployed MakaLearn version.

---

## Suggested figure for this subsection

**Figure 9. Final MSAV Validation Flow**

Use this sequence in a simple flow diagram:

`Ordered Playground cards` → `Maximum of five cards` → `Approved-library ID check` → `Sentence-role availability` → `Single-card or multi-card branch` → `Order and subject-agreement rules` → `Semantic compatibility rules` → `Valid: Good Job + sentence playback` / `Invalid: Try Again + corrective prompt`

The figure should present the algorithm as a deterministic decision flow. Do not include MediaPipe, CNN confidence, or gesture prediction in this figure because those belong to Phase 2b and the Gesture Practice component.

---

## Evidence ledger for the researchers

| Claim used in the draft | Direct evidence |
|---|---|
| Phase 2c was planned as a rule-based symbol validator | Thesis PDF, methodology pages 100-109 (PDF pages 109-118) |
| Phase 2c is blank in the current Results and Discussion | Thesis PDF, manuscript page 159 (PDF page 168) |
| The current inventory has 50 cards and ten sentence roles | `public/pecs/pecs_arasaac_manifest.json`; `src/types/index.ts` |
| The current algorithm validates library membership and a maximum of five cards | `src/utils/pecs-sentence-validation.ts`, especially lines 297-323 |
| The current rules check subject agreement and semantic compatibility | `src/utils/pecs-sentence-validation.ts`, especially lines 20-54 and 123-294 |
| The Playground constructs the runtime card set and approved IDs | `src/features/playground/playground-view.tsx`, especially lines 56, 114-142, and 241-242 |
| Check and Listen use the same validator | `src/features/playground/playground-view.tsx`, especially lines 389-447 |
| The full two-card space is tested | `scripts/test-pecs-sentence-validation.mjs`, especially lines 181-220 |
| All one-card inputs and representative owner cases are tested | `scripts/test-pecs-sentence-validation.mjs`, especially lines 222-244 |
| The test command is part of the project | `package.json`, script `test:playground` |
| The current test result is 13/13 passing | `npm run test:playground`, executed October 5, 2026 |
| Development began with broad role patterns and was later refined | Git history of `src/utils/pecs-sentence-validation.ts`: commits `6c2af87`, `403aac8`, `4a0992f`, `734e641`, `0ea57e9`, `8c03340`, and `9925f25` |

## Recommended manuscript adjustment

Revise the Phase 2c methodology tables before final submission so they describe the final functional MSAV rules shown in Table 7 above. If the original five BSRs must remain as formal acceptance criteria, the software would first need additional cards, role types, and rules for the four-card helping/main-verb construction, object-led adjective construction, and adverb construction. Without those changes, the paper should not mark “Five basic sentence structure rules are defined” as completed.
