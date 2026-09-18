import type { ResumeSections } from "./resumeDocumentParser.service";

export interface ScorableSkill {
  name: string;
  category: string;
  weight: number;
  occurrences: number;
  sections: string[];
}

export interface SkillContribution {
  name: string;
  category: string;
  weight: number;
  occurrences: number;
  sections: string[];
  coverageContribution: number;
  repeatedEvidence: boolean;
  demonstratedEvidence: boolean;
}

export interface DeterministicResumeScore {
  overall: number;
  subscores: {
    skillCoverage: number;
    skillEvidence: number;
    sectionCompleteness: number;
    projectEvidence: number;
    experienceEvidence: number;
    structuralChecks: number;
  };
  skillContributions: SkillContribution[];
  strengths: string[];
  weaknesses: string[];
}

export interface ResumeScoringInput {
  cleanedText: string;
  sections?: Partial<ResumeSections>;
  extractedSkills: ScorableSkill[];
}

/**
 * Centralized, application-defined component caps. These values are not ATS
 * standards and this service neither calls nor changes Gemini or legacy ATS code.
 */
export const RESUME_SCORE_COMPONENT_CAPS = {
  skillCoverage: 30,
  skillEvidence: 20,
  sectionCompleteness: 20,
  projectEvidence: 15,
  experienceEvidence: 10,
  structuralChecks: 5,
} as const;

const ACTION_VERBS = /\b(built|developed|designed|implemented|created|led|improved|optimized|deployed|delivered|engineered|automated|analyzed)\b/i;
const OUTCOME_PATTERN = /(?:\b\d+(?:\.\d+)?%|\$\s?\d+|\b\d+\s*(?:users|clients|customers|projects|hours|days|months|years)\b)/i;
const hasMeaningfulContent = (value: string | undefined, minimumLength = 20): boolean => Boolean(value && value.trim().length >= minimumLength);
const hasSkillIn = (skills: ScorableSkill[], sections: string[]): boolean => skills.some((skill) => skill.sections.some((section) => sections.includes(section)));

/**
 * Deterministic scoring formula (0-100):
 * - Coverage (max 30): sum unique canonical skill weights, capped at 30.
 * - Evidence (max 20): up to 10 points for repeated mentions and 10 for skills
 *   demonstrated in experience/projects/internships; each is capped by skill count.
 * - Completeness (max 20): summary 4, education 4, skills 4, either project or
 *   experience 6, certifications/achievements 2. Projects satisfy career evidence
 *   for student resumes; optional sections are never required.
 * - Project evidence (max 15): meaningful content 6, project skills 4, action verb
 *   3, measurable outcome 2.
 * - Experience evidence (max 10): meaningful content 4, demonstrated skill 3,
 *   action verb 2, measurable outcome 1. Internships count as experience evidence.
 * - Structural checks (max 5): readable text 1, 250+ characters 2, 3+ populated
 *   sections 2.
 */
export const calculateDeterministicResumeScore = ({ cleanedText, sections = {}, extractedSkills }: ResumeScoringInput): DeterministicResumeScore => {
  const uniqueSkills = [...new Map(extractedSkills.map((skill) => [skill.name, skill])).values()];
  const skillContributions = uniqueSkills.map((skill) => ({
    name: skill.name,
    category: skill.category,
    weight: skill.weight,
    occurrences: skill.occurrences,
    sections: [...skill.sections],
    coverageContribution: skill.weight,
    repeatedEvidence: skill.occurrences >= 2,
    demonstratedEvidence: skill.sections.some((section) => ["experience", "projects", "internships"].includes(section)),
  }));

  const skillCoverage = Math.min(RESUME_SCORE_COMPONENT_CAPS.skillCoverage, skillContributions.reduce((total, skill) => total + skill.coverageContribution, 0));
  const repeatedSkills = skillContributions.filter((skill) => skill.repeatedEvidence).length;
  const demonstratedSkills = skillContributions.filter((skill) => skill.demonstratedEvidence).length;
  const skillEvidence = Math.min(10, repeatedSkills) + Math.min(10, demonstratedSkills);

  const hasSummary = hasMeaningfulContent(sections.summary, 30);
  const hasEducation = hasMeaningfulContent(sections.education, 10);
  const hasSkills = hasMeaningfulContent(sections.skills, 2) || uniqueSkills.length > 0;
  const hasProjects = hasMeaningfulContent(sections.projects, 30);
  const hasExperience = hasMeaningfulContent(sections.experience, 30) || hasMeaningfulContent(sections.internships, 30);
  const hasOptionalAchievement = hasMeaningfulContent(sections.certifications, 10) || hasMeaningfulContent(sections.achievements, 10);
  const sectionCompleteness = (hasSummary ? 4 : 0) + (hasEducation ? 4 : 0) + (hasSkills ? 4 : 0) + (hasProjects || hasExperience ? 6 : 0) + (hasOptionalAchievement ? 2 : 0);

  const projectText = sections.projects?.trim() || "";
  const projectEvidence = Math.min(RESUME_SCORE_COMPONENT_CAPS.projectEvidence,
    (hasMeaningfulContent(projectText, 50) ? 6 : 0) + (hasSkillIn(uniqueSkills, ["projects"]) ? 4 : 0) + (ACTION_VERBS.test(projectText) ? 3 : 0) + (OUTCOME_PATTERN.test(projectText) ? 2 : 0)
  );

  const experienceText = [sections.experience, sections.internships].filter(Boolean).join("\n");
  const experienceEvidence = Math.min(RESUME_SCORE_COMPONENT_CAPS.experienceEvidence,
    (hasMeaningfulContent(experienceText, 50) ? 4 : 0) + (hasSkillIn(uniqueSkills, ["experience", "internships"]) ? 3 : 0) + (ACTION_VERBS.test(experienceText) ? 2 : 0) + (OUTCOME_PATTERN.test(experienceText) ? 1 : 0)
  );

  const populatedSections = Object.values(sections).filter((section) => hasMeaningfulContent(section, 2)).length;
  const structuralChecks = (cleanedText.trim().length > 0 ? 1 : 0) + (cleanedText.trim().length >= 250 ? 2 : 0) + (populatedSections >= 3 ? 2 : 0);
  const overall = skillCoverage + skillEvidence + sectionCompleteness + projectEvidence + experienceEvidence + structuralChecks;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (skillCoverage >= 20) strengths.push("Broad set of recognized technical skills.");
  if (demonstratedSkills >= 2) strengths.push("Skills are demonstrated in projects, experience, or internships.");
  if (hasProjects) strengths.push("Meaningful project evidence is present.");
  if (hasExperience) strengths.push("Experience or internship evidence is present.");
  if (!hasSummary) weaknesses.push("Add a concise professional summary or objective.");
  if (!hasSkills) weaknesses.push("Add an explicit Skills section with relevant technologies.");
  if (!hasEducation) weaknesses.push("Add an Education section.");
  if (!hasProjects && !hasExperience) weaknesses.push("Add project, internship, or work-experience evidence.");
  if (uniqueSkills.length === 0) weaknesses.push("No controlled taxonomy skills were detected.");

  return { overall: Math.max(0, Math.min(100, overall)), subscores: { skillCoverage, skillEvidence, sectionCompleteness, projectEvidence, experienceEvidence, structuralChecks }, skillContributions, strengths, weaknesses };
};
