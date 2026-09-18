import type { ResumeSections } from "./resumeDocumentParser.service";
import { SKILL_TAXONOMY, type SkillCategory, type SkillKind } from "../data/skills/skillTaxonomy";

export interface ExtractedSkill { name: string; category: SkillCategory; kind: SkillKind; weight: number; occurrences: number; sections: string[]; matchedTexts: string[]; rankingScore: number; rank: number; }
export interface SkillExtractionResult { skills: ExtractedSkill[]; totalDetectedSkills: number; }
export interface SkillExtractionInput { cleanedText: string; sections?: Partial<ResumeSections>; }

const SECTION_EVIDENCE: Record<string, number> = { skills: 4, experience: 3, projects: 3, certifications: 3, internships: 3, education: 2, achievements: 2, publications: 2, extracurricular: 1, summary: 1, unclassified: 1 };
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const aliases = [...SKILL_TAXONOMY].flatMap((definition) => definition.aliases.map((alias) => ({ alias, definition }))).sort((a, b) => b.alias.length - a.alias.length);
const aliasLookup = new Map(aliases.map(({ alias, definition }) => [alias.toLowerCase(), definition]));
const matcher = new RegExp(`(^|[^A-Za-z0-9])(${aliases.map(({ alias }) => escapeRegExp(alias)).join("|")})(?=$|[^A-Za-z0-9])`, "gi");
const evidenceFor = (sections: string[]): number => sections.reduce((total, section) => total + (SECTION_EVIDENCE[section] ?? SECTION_EVIDENCE.unclassified), 0);

/** Longer aliases match first. Ranking is deterministic ordering only: weight, section evidence, then capped occurrences. */
export const extractSkills = ({ cleanedText, sections = {} }: SkillExtractionInput): SkillExtractionResult => {
  const populatedSections = Object.entries(sections).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);
  const sources = populatedSections.length > 0 ? populatedSections : cleanedText.trim() ? [["unclassified", cleanedText]] : [];
  const detected = new Map<string, Omit<ExtractedSkill, "rankingScore" | "rank">>();
  for (const [section, text] of sources) {
    matcher.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(text)) !== null) {
      const matchedText = match[2];
      const definition = aliasLookup.get(matchedText.toLowerCase());
      if (!definition || (definition.requiresExplicitSkillContext && section !== "skills")) continue;
      const existing = detected.get(definition.name);
      if (existing) { existing.occurrences += 1; if (!existing.sections.includes(section)) existing.sections.push(section); if (!existing.matchedTexts.includes(matchedText)) existing.matchedTexts.push(matchedText); }
      else detected.set(definition.name, { name: definition.name, category: definition.category, kind: definition.kind, weight: definition.weight, occurrences: 1, sections: [section], matchedTexts: [matchedText] });
    }
  }
  const skills = [...detected.values()].map((skill) => ({ ...skill, rankingScore: skill.weight * 100 + evidenceFor(skill.sections) * 10 + Math.min(skill.occurrences, 3), rank: 0 })).sort((a, b) => b.rankingScore - a.rankingScore || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((skill, index) => ({ ...skill, rank: index + 1 }));
  return { skills, totalDetectedSkills: skills.length };
};
