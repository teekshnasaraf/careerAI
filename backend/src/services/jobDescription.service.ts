import { SKILL_TAXONOMY, type SkillCategory, type SkillKind } from "../data/skills/skillTaxonomy";

export type RequirementPriority = "required" | "preferred" | "unspecified";

export interface JobRequirement {
  name: string;
  category: SkillCategory;
  kind: SkillKind;
  weight: number;
  priority: RequirementPriority;
  occurrences: number;
  matchedTexts: string[];
}

export interface ParsedJobDescription {
  cleanedText: string;
  requirements: JobRequirement[];
  totalDetectedRequirements: number;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const aliases = [...SKILL_TAXONOMY]
  .flatMap((definition) => definition.aliases.map((alias) => ({ alias, definition })))
  .sort((a, b) => b.alias.length - a.alias.length);

const aliasLookup = new Map(aliases.map(({ alias, definition }) => [alias.toLowerCase(), definition]));

const matcher = new RegExp(
  `(^|[^A-Za-z0-9])(${aliases.map(({ alias }) => escapeRegExp(alias)).join("|")})(?=$|[^A-Za-z0-9])`,
  "gi"
);

const priorityRank: Record<RequirementPriority, number> = {
  unspecified: 0,
  preferred: 1,
  required: 2,
};

const requiredMarker = /\b(required|requirements?|must[- ]have|mandatory|essential|minimum qualifications?)\b/i;
const preferredMarker = /\b(preferred|nice[- ]to[- ]have|bonus|desired|plus|preferred qualifications?)\b/i;
const unspecifiedMarker = /\b(responsibilities|about (?:us|the company|the role|the team|our stack)|what you(?:'ll| will) do|who you are|overview|summary|benefits|perks)\b/i;

const determineLinePriority = (line: string, current: RequirementPriority): RequirementPriority => {
  if (requiredMarker.test(line)) return "required";
  if (preferredMarker.test(line)) return "preferred";
  if (unspecifiedMarker.test(line)) return "unspecified";
  return current;
};

/**
 * Deterministic Job Description Parser:
 * 1. Normalizes text format (newlines, whitespace).
 * 2. Scans line-by-line to track priority headings/markers (required, preferred, unspecified).
 * 3. Matches canonical skills via existing SKILL_TAXONOMY aliases.
 * 4. Deduplicates multiple mentions into a single canonical requirement while tracking occurrences.
 * 5. Elevated priority wins if a skill is mentioned in multiple contexts (e.g., required > unspecified).
 */
export const parseJobDescription = (jobDescription: string): ParsedJobDescription => {
  if (!jobDescription || typeof jobDescription !== "string") {
    return { cleanedText: "", requirements: [], totalDetectedRequirements: 0 };
  }

  const cleanedText = jobDescription
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanedText) {
    return { cleanedText: "", requirements: [], totalDetectedRequirements: 0 };
  }

  const requirements = new Map<string, JobRequirement>();
  let currentPriority: RequirementPriority = "unspecified";

  for (const rawLine of cleanedText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const priority = determineLinePriority(line, currentPriority);
    const hasPriorityMarker =
      priority !== currentPriority ||
      requiredMarker.test(line) ||
      preferredMarker.test(line);

    currentPriority = priority;

    matcher.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(line)) !== null) {
      const matchedText = match[2];
      const definition = aliasLookup.get(matchedText.toLowerCase());

      // Ambiguous one-word language aliases (e.g. C, Go) only count under an explicit JD priority context.
      if (!definition || (definition.requiresExplicitSkillContext && priority === "unspecified" && !hasPriorityMarker)) {
        continue;
      }

      const existing = requirements.get(definition.name);
      if (existing) {
        existing.occurrences += 1;
        if (!existing.matchedTexts.includes(matchedText)) {
          existing.matchedTexts.push(matchedText);
        }
        if (priorityRank[priority] > priorityRank[existing.priority]) {
          existing.priority = priority;
        }
      } else {
        requirements.set(definition.name, {
          name: definition.name,
          category: definition.category,
          kind: definition.kind,
          weight: definition.weight,
          priority,
          occurrences: 1,
          matchedTexts: [matchedText],
        });
      }
    }
  }

  const sorted = [...requirements.values()].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );

  return {
    cleanedText,
    requirements: sorted,
    totalDetectedRequirements: sorted.length,
  };
};
