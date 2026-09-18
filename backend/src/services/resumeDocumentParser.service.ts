import fs from "fs";
import path from "path";
import mammoth from "mammoth";

// pdf-parse v2 exposes a class rather than the legacy callable API.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");

export const RESUME_SECTION_KEYS = [
  "summary",
  "education",
  "skills",
  "experience",
  "projects",
  "certifications",
  "achievements",
  "internships",
  "publications",
  "extracurricular",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

export type ResumeSections = Record<ResumeSectionKey, string>;

export interface ParsedResumeDocument {
  rawText: string;
  cleanedText: string;
  sections: ResumeSections;
}

export class ResumeParserError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ResumeParserError";
  }
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SECTION_ALIASES: Record<ResumeSectionKey, string[]> = {
  summary: ["summary", "professional summary", "profile", "professional profile", "objective", "career objective", "about me", "overview", "personal profile"],
  education: ["education", "academic background", "academic qualifications", "qualifications", "academics", "educational details"],
  skills: ["skills", "technical skills", "core skills", "key skills", "professional skills", "technical competencies", "core competencies", "technologies", "tools and technologies"],
  experience: ["experience", "work experience", "professional experience", "employment history", "work history", "career history", "professional background"],
  projects: ["projects", "personal projects", "academic projects", "relevant projects", "key projects", "featured projects", "technical projects", "project experience"],
  certifications: ["certifications", "certificates", "licenses and certifications", "professional certifications", "credentials"],
  achievements: ["achievements", "awards", "honors", "accomplishments", "awards and achievements"],
  internships: ["internships", "internship", "internship experience"],
  publications: ["publications", "research publications", "papers", "research papers"],
  extracurricular: ["extracurricular activities", "extracurriculars", "activities", "leadership and activities", "co curricular activities"],
};

const emptySections = (): ResumeSections => ({
  summary: "",
  education: "",
  skills: "",
  experience: "",
  projects: "",
  certifications: "",
  achievements: "",
  internships: "",
  publications: "",
  extracurricular: "",
});

const normaliseHeading = (value: string): string => value
  .toLowerCase()
  .replace(/[|:_-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const findSectionKey = (heading: string): ResumeSectionKey | undefined => {
  const normalised = normaliseHeading(heading);

  return RESUME_SECTION_KEYS.find((key) =>
    SECTION_ALIASES[key].some((alias) => normaliseHeading(alias) === normalised)
  );
};

const getHeading = (line: string): { key: ResumeSectionKey; inlineContent: string } | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;

  const directKey = findSectionKey(trimmed);
  if (directKey) return { key: directKey, inlineContent: "" };

  const inlineMatch = trimmed.match(/^(.{1,60}):\s+(.+)$/);
  if (!inlineMatch) return null;

  const key = findSectionKey(inlineMatch[1]);
  return key ? { key, inlineContent: inlineMatch[2].trim() } : null;
};

export const cleanResumeText = (rawText: string): string => {
  const normalisedNewlines = rawText
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[\u00A0\u200B\uFEFF]/g, " ")
    // Common mojibake produced by PDF extraction; preserve the intended bullet.
    .replace(/â€¢/g, "•");

  const lines = normalisedNewlines.split("\n");
  const cleanedLines: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const cleanedLine = line.replace(/[\t ]+/g, " ").trimEnd();
    const isBlank = cleanedLine.trim().length === 0;

    // Keep a single blank line as a section boundary, but remove extraction noise.
    if (isBlank && previousWasBlank) continue;
    cleanedLines.push(isBlank ? "" : cleanedLine.trimStart());
    previousWasBlank = isBlank;
  }

  return cleanedLines.join("\n").trim();
};

export const detectResumeSections = (cleanedText: string): ResumeSections => {
  const sections = emptySections();
  let activeSection: ResumeSectionKey | null = null;
  const sectionLines: Partial<Record<ResumeSectionKey, string[]>> = {};

  for (const line of cleanedText.split("\n")) {
    const heading = getHeading(line);
    if (heading) {
      activeSection = heading.key;
      sectionLines[activeSection] ??= [];
      if (heading.inlineContent) sectionLines[activeSection]!.push(heading.inlineContent);
      continue;
    }

    if (activeSection) sectionLines[activeSection]!.push(line);
  }

  for (const key of RESUME_SECTION_KEYS) {
    sections[key] = (sectionLines[key] ?? [])
      .join("\n")
      .replace(/^\n+|\n+$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return sections;
};

export const extractResumeText = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  const extension = path.extname(filePath).toLowerCase();
  const isPdf = extension === ".pdf";
  const isDocx = extension === ".docx";

  if (!isPdf && !isDocx) {
    throw new ResumeParserError("Unsupported file type. Please upload a PDF or DOCX resume.", 415);
  }

  if (mimeType && !SUPPORTED_MIME_TYPES.has(mimeType) && mimeType !== "application/octet-stream") {
    throw new ResumeParserError("Unsupported file type. Please upload a PDF or DOCX resume.", 415);
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(filePath);
  } catch {
    throw new ResumeParserError("The uploaded resume could not be read.", 422);
  }

  if (fileBuffer.length === 0) {
    throw new ResumeParserError("The uploaded resume is empty.", 400);
  }

  try {
    if (isPdf) {
      const parser = new PDFParse({ data: fileBuffer });
      try {
        const result = await parser.getText();
        return result.text || "";
      } finally {
        await parser.destroy();
      }
    }

    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || "";
  } catch {
    throw new ResumeParserError(
      `The ${isPdf ? "PDF" : "DOCX"} resume is corrupted or could not be parsed.`,
      422
    );
  }
};

export const parseResumeDocument = async (
  filePath: string,
  mimeType: string
): Promise<ParsedResumeDocument> => {
  const rawText = await extractResumeText(filePath, mimeType);
  const cleanedText = cleanResumeText(rawText);

  if (!cleanedText) {
    throw new ResumeParserError(
      "No readable text could be extracted from this resume. Please upload a text-based PDF or DOCX file.",
      422
    );
  }

  return {
    rawText,
    cleanedText,
    sections: detectResumeSections(cleanedText),
  };
};
