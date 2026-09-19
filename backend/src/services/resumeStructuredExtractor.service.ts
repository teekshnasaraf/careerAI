/**
 * resumeStructuredExtractor.service.ts
 *
 * Deterministic structured data extraction from pre-detected resume sections.
 * Consumes the `ResumeSections` produced by `resumeDocumentParser.service.ts`
 * so that section classification is the single centralized source of truth.
 *
 * Responsibilities:
 *  - Extract a professional summary ONLY when an explicit summary section exists.
 *  - Group education lines into cohesive records (degree + institution + period + score).
 *  - Extract professional experience and internships; never fabricate fallback entries.
 *  - Group project lines; attach URLs as link metadata, not as project titles.
 *  - Preserve extracurricular and achievement content as structured text.
 *
 * Does NOT use Gemini, embeddings, or LLM inference.
 * Does NOT hard-code institution names, degree names, skill names, or dates.
 */

import type { ResumeSections } from "./resumeDocumentParser.service";

// ─── Exported interfaces ──────────────────────────────────────────────────────

export interface StructuredExperience {
  title: string;
  company: string;
  duration: string;
  bulletPoints: string[];
}

export interface StructuredEducation {
  degree: string;
  institution: string;
  /** Extracted date/period as it appears in the document (e.g. "2020 – 2024", "May 2024"). Empty when not found. */
  year: string;
  score: string;
}

export interface StructuredProject {
  title: string;
  description: string;
  technologies: string[];
  links: string[];
}

export interface StructuredParsedData {
  summary: string;
  experience: StructuredExperience[];
  education: StructuredEducation[];
  projects: StructuredProject[];
  extracurricular: string;
  achievements: string;
}

// ─── Generic detection patterns ───────────────────────────────────────────────

/**
 * Matches date expressions that commonly appear in education/experience entries.
 * Handles: "May 2024", "2020", "2020 - 2024", "Aug 2022 – Present", "2019-20", "2021/22"
 */
const DATE_PERIOD_RE =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}(?:\s*[-–—\/]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:(?:19|20)\d{2}|\d{2}|Present|Current|Ongoing|Now))?/gi;

/**
 * Detects lines or segments that look like academic qualifications / degree titles.
 * Matched words trigger a new education group.
 */
const QUALIFICATION_RE =
  /\b(?:B\.?\s*Tech|B\.?\s*E\.?|B\.?\s*Sc\.?|B\.?\s*S\.?|M\.?\s*Tech|M\.?\s*Sc\.?|M\.?\s*S\.?|M\.?\s*E\.?|MBA|Ph\.?\s*D\.?|PhD|Bachelor|Master|Doctor(?:ate)?|B\.?\s*Com|BBA|BCA|MCA|PGDM|Post\s*Grad(?:uate)?|Diploma|Senior\s*Secondary|Higher\s*Secondary|XII|XII(?:th)?|X(?:th)?|High\s*School|Secondary\s*School|Associate)\b/i;

/**
 * Detects lines that look like an institution name.
 */
const INSTITUTION_RE =
  /\b(?:University|Institute|IIT|NIT|IIM|BITS|IIIT|Academy|College|School|Polytechnic|Centre|Center|Campus|Deemed|Autonomous|Affiliated)\b/i;

/**
 * Detects score/grade lines.
 */
const SCORE_RE =
  /\b(?:CGPA|GPA|Score|Grade|Percentage|Marks)\b[\s:]*[\d.]+\s*(?:\/\s*[\d.]+)?\s*%?/i;

/**
 * Detects a URL anywhere in a line.
 */
const URL_RE =
  /https?:\/\/[^\s,;)>\"\']+|(?:www\.)[^\s,;)>\"\']+|(?:github|gitlab|bitbucket|linkedin)\.com\/[^\s,;)>\"\']+/i;

/**
 * Job/internship title keywords that signal a new experience entry.
 */
const EXP_TITLE_RE =
  /\b(?:Engineer|Developer|Intern(?:ship)?|Manager|Lead|Architect|Analyst|Designer|Scientist|Consultant|Associate|Specialist|Researcher|Coordinator|Administrator|Executive|Officer|Director|Head\s+of)\b/i;

/**
 * Matches lines that look like they contain a company/org name following a title.
 * Simple heuristic: short line with capitalised words, no bullets.
 */
const COMPANY_LIKE_RE = /^[A-Z][^a-z\n]{0,5}[A-Za-z].*$/;

/**
 * Bullet / list-item prefix characters.
 */
const BULLET_PREFIX_RE = /^[•\-*➤▶→►◆◇▸]\s*/;

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Split text into non-empty lines, stripping leading/trailing whitespace per line. */
const splitLines = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Split text into paragraph blocks (separated by ≥1 blank line). */
const splitBlocks = (text: string): string[][] => {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
};

/** Extract the first date/period string from a text segment. Returns "" if none found. */
const extractPeriod = (text: string): string => {
  DATE_PERIOD_RE.lastIndex = 0;
  const m = DATE_PERIOD_RE.exec(text);
  return m ? m[0].trim() : "";
};

/** Extract the first score/grade expression from a line. Returns "" if none found. */
const extractScore = (text: string): string => {
  const m = text.match(SCORE_RE);
  return m ? m[0].trim() : "";
};

/** True if the line consists almost entirely of a URL (link-only line). */
const isUrlLine = (line: string): boolean => {
  const stripped = line.replace(URL_RE, "").trim();
  return URL_RE.test(line) && stripped.length < 15;
};

/** Extract all URLs from a block of text. */
const extractUrls = (lines: string[]): string[] => {
  const found: string[] = [];
  for (const line of lines) {
    URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(URL_RE.source, "gi");
    while ((m = re.exec(line)) !== null) {
      found.push(m[0]);
    }
  }
  return found;
};

/** Strip contact-info patterns from the start of a block (email, phone, URL). */
const CONTACT_LINE_RE =
  /^(?:[\w.+-]+@[\w.-]+\.\w{2,}|\+?[\d\s\-().]{7,}|https?:\/\/[^\s]+|www\.[^\s]+|github\.com\/[^\s]+|linkedin\.com\/[^\s]+)$/i;

// ─── Summary extraction ───────────────────────────────────────────────────────

/**
 * Extracts the professional summary from the dedicated summary section.
 * Returns "" when no summary section exists — never uses header/contact lines.
 */
export const extractSummary = (summarySection: string): string => {
  if (!summarySection || !summarySection.trim()) return "";

  const lines = splitLines(summarySection);
  const kept: string[] = [];

  for (const line of lines) {
    // Skip contact-information lines
    if (CONTACT_LINE_RE.test(line)) continue;
    // Skip lines that are entirely a URL
    if (isUrlLine(line)) continue;
    // Skip very short lines that are likely headings or labels
    if (line.length < 8 && !/[a-z]/.test(line)) continue;
    kept.push(line);
  }

  return kept.join(" ").replace(/\s{2,}/g, " ").trim().slice(0, 500);
};

// ─── Education extraction ─────────────────────────────────────────────────────

/**
 * Sub-splits a block of lines whenever a new QUALIFICATION_RE marker is found
 * after the first line, so two degree entries that were not separated by a blank
 * line are still recognized as distinct records.
 */
const subSplitEducationBlock = (lines: string[]): string[][] => {
  const groups: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && QUALIFICATION_RE.test(line) && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

/**
 * Converts a block of education-section lines into a single StructuredEducation record.
 */
const parseEducationBlock = (lines: string[]): StructuredEducation | null => {
  if (lines.length === 0) return null;

  let degree = "";
  let institution = "";
  let year = "";
  let score = "";

  for (const line of lines) {
    // Score takes priority over other classifications
    if (!score) {
      const s = extractScore(line);
      if (s) {
        score = s;
        continue;
      }
    }

    // Date/period line
    if (!year) {
      const p = extractPeriod(line);
      if (p && p.length >= 4) {
        year = p;
        // Don't `continue` — the line might also contain a location; let institution check run
      }
    }

    // Institution line
    if (!institution && INSTITUTION_RE.test(line)) {
      institution = line;
      continue;
    }

    // Degree/qualification line
    if (!degree && QUALIFICATION_RE.test(line)) {
      degree = line;
      continue;
    }
  }

  // Fallback: first line as degree title when not yet assigned
  if (!degree && lines[0]) {
    degree = lines[0];
  }

  // Don't emit an empty/useless record
  if (!degree && !institution) return null;

  return { degree, institution, year, score };
};

/**
 * Extracts a list of structured education records from the education section text.
 * Groups related lines; never fabricates dates or institution names.
 */
export const extractEducation = (educationSection: string): StructuredEducation[] => {
  if (!educationSection || !educationSection.trim()) return [];

  const blocks = splitBlocks(educationSection);
  const records: StructuredEducation[] = [];

  for (const block of blocks) {
    // Sub-split within the block in case two entries are not separated by a blank line
    const subGroups = subSplitEducationBlock(block);
    for (const group of subGroups) {
      const record = parseEducationBlock(group);
      if (record) records.push(record);
    }
  }

  return records;
};

// ─── Experience extraction ────────────────────────────────────────────────────

/**
 * Parses experience section lines into structured entries.
 * Returns [] when no entries are found — never injects a fallback entry.
 */
const parseExperienceSection = (sectionText: string): StructuredExperience[] => {
  if (!sectionText || !sectionText.trim()) return [];

  const lines = splitLines(sectionText);
  const entries: StructuredExperience[] = [];
  let current: StructuredExperience | null = null;

  for (const line of lines) {
    // A date match alone on a line does not make a new entry.
    // Only use date presence to augment an existing entry's duration.
    const dateMatch = extractPeriod(line);
    // A title line must explicitly match the job-title pattern.
    // We do NOT start a new entry from a bullet point or a line that is only a date.
    const isBullet = BULLET_PREFIX_RE.test(line) || line.startsWith("–");
    const isDateOnly = dateMatch && line.replace(DATE_PERIOD_RE, "").trim().length < 5;
    DATE_PERIOD_RE.lastIndex = 0;
    const isTitleLike = !isBullet && !isDateOnly && EXP_TITLE_RE.test(line) && line.length < 120;

    if (isTitleLike) {
      if (current) entries.push(current);
      current = {
        title: line,
        company: "",
        duration: dateMatch || "",
        bulletPoints: [],
      };
    } else if (current) {
      if (isBullet) {
        current.bulletPoints.push(line.replace(BULLET_PREFIX_RE, "").replace(/^–\s*/, ""));
      } else if (isDateOnly && !current.duration) {
        current.duration = dateMatch;
      } else if (!current.company && line.length < 80 && COMPANY_LIKE_RE.test(line) && !isBullet) {
        current.company = line;
      } else if (current.bulletPoints.length < 10) {
        // Remaining non-empty lines become bullet points
        current.bulletPoints.push(line);
      }
    }
  }

  if (current) entries.push(current);
  return entries;
};

/**
 * Extracts professional experience from the experience and internship sections.
 * Extracurricular/activities/achievements sections are intentionally excluded.
 */
export const extractExperience = (
  experienceSection: string,
  internshipSection: string
): StructuredExperience[] => {
  const fromExp = parseExperienceSection(experienceSection);
  const fromIntern = parseExperienceSection(internshipSection);
  return [...fromExp, ...fromIntern];
};

// ─── Project extraction ───────────────────────────────────────────────────────

/**
 * Sentence-starting verb patterns: lines starting with these are descriptions, not titles.
 * Must be checked before treating a line as a project title.
 */
const SENTENCE_VERB_RE =
  /^(?:Built|Developed|Designed|Created|Implemented|Built|Deployed|Led|Improved|Optimized|Automated|Analyzed|Integrated|Built|Used|Utilized|Trained|Performed|Collaborated|Managed|Worked|Contributed|Achieved|Completed|Reduced|Increased|Leveraged|Established|Handled|Maintained|Supported|Delivered|Launched|Coordinated|Researched|Wrote|Generated|Applied|Extended|Configured|Migrated|Scaled|Enabled|Produced|Tested|Solved|Designed|Prepared|Ensured|Provided|Introduced|Monitored|Refactored)/i;

/**
 * Returns true when a line should start a new project entry.
 * A project title line must be:
 *  - Short (< 65 chars) — titles are names, not sentences
 *  - Start with a capital letter
 *  - Not a bullet-point line
 *  - Not a URL-only line
 *  - Not starting with a common descriptive/action verb (those are description lines)
 *  - Not a date-range-only line
 */
const isProjectTitle = (line: string): boolean => {
  if (!line || line.length >= 65) return false;
  if (BULLET_PREFIX_RE.test(line)) return false;
  if (isUrlLine(line)) return false;
  // A line that is primarily a URL
  if (URL_RE.test(line) && line.replace(URL_RE, "").trim().length < 10) return false;
  // Lines starting with sentence-starting verbs are descriptions
  if (SENTENCE_VERB_RE.test(line)) return false;
  // Must start with a capital letter (project names are proper nouns / title case)
  if (!/^[A-Z]/.test(line)) return false;
  // A date-only line is not a title
  const dateOnly = line.replace(DATE_PERIOD_RE, "").trim();
  DATE_PERIOD_RE.lastIndex = 0;
  if (dateOnly.length < 4 && DATE_PERIOD_RE.test(line)) return false;
  DATE_PERIOD_RE.lastIndex = 0;
  return true;
};

/**
 * Extracts structured project entries from the projects section text.
 * URLs inside a project block become `links`, NOT replacement titles or descriptions.
 */
export const extractProjects = (projectsSection: string): StructuredProject[] => {
  if (!projectsSection || !projectsSection.trim()) return [];

  const lines = splitLines(projectsSection);
  const projects: StructuredProject[] = [];
  let current: StructuredProject | null = null;

  for (const line of lines) {
    // A URL-only line → attach to current project as a link
    if (isUrlLine(line)) {
      if (current) {
        const urlMatch = line.match(URL_RE);
        if (urlMatch) current.links.push(urlMatch[0]);
      }
      continue;
    }

    // A line that contains a URL mixed with other text → extract the URL but keep the text for description
    const inlineUrlMatch = line.match(URL_RE);

    if (isProjectTitle(line) && !inlineUrlMatch) {
      // Start a new project entry
      if (current) projects.push(current);
      current = {
        title: line,
        description: "",
        technologies: [],
        links: [],
      };
    } else if (current) {
      // Append to description of the current project
      const textPart = inlineUrlMatch
        ? line.replace(URL_RE, "").trim()
        : line.replace(BULLET_PREFIX_RE, "");

      if (inlineUrlMatch) current.links.push(inlineUrlMatch[0]);

      const cleaned = textPart.replace(/\s{2,}/g, " ").trim();
      if (cleaned) {
        current.description += (current.description ? " " : "") + cleaned;
      }
    } else {
      // No active project yet and line is a title candidate
      if (isProjectTitle(line)) {
        current = {
          title: line,
          description: "",
          technologies: [],
          links: [],
        };
      }
    }
  }

  if (current) projects.push(current);
  return projects;
};

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Produces fully structured resume data from the pre-detected `sections` object.
 * This is the single source of truth for `parsedData` written to the database.
 *
 * @param sections - Output of `detectResumeSections` / `parseResumeDocument`.
 */
export const extractStructuredFromSections = (
  sections: Partial<ResumeSections>
): StructuredParsedData => {
  return {
    summary: extractSummary(sections.summary ?? ""),
    experience: extractExperience(
      sections.experience ?? "",
      sections.internships ?? ""
    ),
    education: extractEducation(sections.education ?? ""),
    projects: extractProjects(sections.projects ?? ""),
    extracurricular: (sections.extracurricular ?? "").trim(),
    achievements: (sections.achievements ?? "").trim(),
  };
};
