# Deterministic skill taxonomy

`skillTaxonomy.ts` is the controlled canonical list. Each entry has a category, kind, precise aliases, and an application-defined weight from 2 to 5. These are future deterministic scoring inputs, not official ATS weights.

`skillExtractor.service.ts` uses phrase-aware case-insensitive matching, matches longer aliases first, and stores canonical names, original matched text, occurrences, and source sections. Gemini is deliberately not used. Ranking is only ordering: weight, distinct-section evidence, then capped occurrences; it is not a resume score.

To add a skill, add one `skill(...)` entry with precise aliases and a focused test. Mark ambiguous one-word names as `requiresExplicitSkillContext` so they only match in `skills`.
