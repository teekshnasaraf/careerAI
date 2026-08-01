import fs from "fs";
import path from "path";
import mammoth from "mammoth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export interface ParsedResumeResult {
  text: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    bulletPoints: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    technologies: string[];
  }>;
  sectionChecklist: Array<{
    name: string;
    key: string;
    found: boolean;
    scoreImpact: string;
    recommendation: string;
  }>;
  atsBreakdown: {
    sectionStructureScore: number;
    skillsCoverageScore: number;
    readabilityScore: number;
    impactMetricsScore: number;
  };
  aiFeedback: Array<{
    type: "strength" | "warning" | "tip";
    title: string;
    description: string;
    actionableStep: string;
  }>;
  atsScore: number;
}

const DICTIONARY_SKILLS = [
  "C++", "C#", "C", "Java", "Python", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind",
  "React", "React.js", "Node.js", "Express", "MongoDB", "SQL", "MySQL", "PostgreSQL",
  "Git", "GitHub", "Docker", "Kubernetes", "AWS", "Azure", "Linux", "REST API", "RESTful APIs",
  "Data Structures", "Algorithms", "OOP", "DBMS", "Operating Systems", "Computer Networks",
  "PHP", "Swift", "Kotlin", "Go", "Golang", "Rust", "Ruby", "Django", "Flask", "Spring Boot",
  "Redux", "GraphQL", "Redis", "CI/CD", "Jest", "Cypress", "PyTorch", "TensorFlow", "Figma"
];

const isLikelySkillListLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return false;

  const hasSkillHeading = /(?:skills|technologies|tools|frameworks|languages|databases|stack|expertise|competencies)/i.test(trimmed);
  const hasListSeparator = /[,|•\-*/\\]/.test(trimmed);
  const hasSentenceMarkers = /\b(?:website|web app|application|platform|product|system|service|built|build|using|used|developed|deliver|delivered|create|created|design|designed|maintain|maintained|work|worked)\b/i.test(trimmed);

  return (hasSkillHeading || (hasListSeparator && trimmed.length <= 120)) && !hasSentenceMarkers;
};

export const calculateUnifiedAtsScore = (data: {
  skillsCount: number;
  hasSummary: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasProjects: boolean;
  hasSkills: boolean;
  hasContactInfo: boolean;
}): number => {
  let score = 0;
  if (data.hasContactInfo) score += 10;
  if (data.hasSummary) score += 10;
  if (data.hasExperience) score += 25;
  if (data.hasEducation) score += 15;
  if (data.hasProjects) score += 15;
  score += Math.min(25, (data.hasSkills ? 10 : 0) + data.skillsCount * 3);

  return Math.min(98, Math.max(45, score));
};

export const extractTextFromFile = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf" || mimeType === "application/pdf") {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text || "";
  }

  if (
    ext === ".docx" ||
    ext === ".doc" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword")
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  return "";
};

export const buildResumeAnalysisPayload = (data: Partial<ParsedResumeResult>) => {
  const summary = data.summary?.trim() || "";
  const skills = data.skills || [];
  const experience = data.experience || [];
  const education = data.education || [];
  const projects = data.projects || [];

  const hasSummary = Boolean(summary);
  const hasSkills = skills.length > 0;
  const hasExperience = experience.length > 0;
  const hasEducation = education.length > 0;
  const hasProjects = projects.length > 0;

  const textContext = [summary, ...experience.map((item) => item.bulletPoints.join(" ")), ...projects.map((item) => item.description)].join(" ");
  const hasMetrics = /\b(?:\d+%|\$\d+|\d+\s*years|\d+\s*k)\b/i.test(textContext);

  const atsScore = typeof data.atsScore === "number"
    ? Math.min(98, Math.max(0, data.atsScore))
    : calculateUnifiedAtsScore({
        skillsCount: skills.length,
        hasSummary,
        hasExperience,
        hasEducation,
        hasProjects,
        hasSkills,
        hasContactInfo: Boolean(summary || skills.length || experience.length || education.length || projects.length),
      });

  const resumeScore = Math.min(98, Math.max(50, atsScore + 5));

  return {
    resumeScore,
    atsScore,
    sectionScores: {
      summaryScore: hasSummary ? 80 : 40,
      skillsScore: hasSkills ? Math.min(95, 45 + skills.length * 7) : 35,
      experienceScore: hasExperience ? 80 : 35,
      educationScore: hasEducation ? 85 : 35,
      projectsScore: hasProjects ? 80 : 35,
    },
    sectionAnalysis: {
      summary: hasSummary ? "Summary section detected and parsed." : "Add a clear professional summary header.",
      skills: hasSkills ? `Detected ${skills.length} technical skills from the resume.` : "Add a dedicated technical skills section.",
      education: hasEducation ? "Education section detected." : "Add your academic background and graduation details.",
      projects: hasProjects ? "Projects section detected." : "Add a projects section with outcomes and technologies.",
      experience: hasExperience ? "Work experience section detected." : "Add a work experience section with quantified achievements.",
    },
    strengths: [
      ...(hasSummary ? ["Professional summary detected."] : []),
      ...(hasSkills ? [`Identified ${skills.length} technical skills.`] : []),
      ...(hasExperience ? ["Work experience section present."] : []),
    ].length > 0 ? [
      ...(hasSummary ? ["Professional summary detected."] : []),
      ...(hasSkills ? [`Identified ${skills.length} technical skills.`] : []),
      ...(hasExperience ? ["Work experience section present."] : []),
    ] : ["Resume text parsed successfully."],
    weaknesses: [
      ...(hasSummary ? [] : ["Professional summary is missing or too brief."]),
      ...(hasSkills ? [] : ["Technical skills section is not clearly listed."]),
      ...(hasExperience ? [] : ["Work experience section is missing or incomplete."]),
      ...(hasMetrics ? [] : ["Add measurable impact metrics to your bullets."]),
    ],
    suggestions: [
      "Use clear section headers and consistent formatting.",
      ...(hasMetrics ? [] : ["Add outcome-based achievements with percentages, revenue, or timelines."]),
    ],
    missingSkills: hasSkills ? [] : ["Add a dedicated technical skills section."],
    recommendedKeywords: skills.slice(0, 8),
    actionVerbs: ["Architected", "Spearheaded", "Engineered", "Optimized"],
    formattingSuggestions: ["Keep section headers standard and easy to scan."],
    topPriorityImprovements: [
      ...(hasSummary ? [] : ["Add a professional summary at the top of the resume."]),
      ...(hasSkills ? [] : ["Add an explicit technical skills section."]),
      ...(hasExperience ? [] : ["Add recent work experience with bullet points."]),
    ],
  };
};

export const parseResumeText = (rawText: string): ParsedResumeResult => {
  const cleanText = rawText.replace(/\r\n/g, "\n").trim();
  const lines = cleanText.split("\n").map((line) => line.trim()).filter(Boolean);

  // 1. Direct Skills Section Parsing (Extract candidate's EXACT listed skills)
  const detectedSkills = new Set<string>();

  const skillsBlockMatch = cleanText.match(
    /(?:skills|technical skills|core skills|technologies|expertise|tools|core competencies|skills & competencies)[\s:\n]+([\s\S]*?)(?=\n\s*(?:experience|work experience|education|academic|projects|employment|work history|certifications|$))/i
  );

  if (skillsBlockMatch && skillsBlockMatch[1]) {
    const rawSkillsBlock = skillsBlockMatch[1].slice(0, 600);
    const rawItems = rawSkillsBlock
      .split(/[,|\n•\-*\/\\]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 1 && s.length <= 35);

    rawItems.forEach((item) => {
      const cleanItem = item.replace(/^languages|^tools|^frameworks|^databases|^web/i, "").trim();
      if (
        cleanItem &&
        !cleanItem.match(/^(?:experience|education|projects|summary|profile|details|qualifications)$/i)
      ) {
        detectedSkills.add(cleanItem);
      }
    });
  }

  // 2. Secondary Dictionary Skill Match Across Structured Lines Only
  lines.filter(isLikelySkillListLine).forEach((line) => {
    DICTIONARY_SKILLS.forEach((skill) => {
      if (skill === "C++") {
        const regex = /(?:^|[^a-zA-Z0-9+#])C\+\+(?:$|[^a-zA-Z0-9+#])/i;
        if (regex.test(line)) detectedSkills.add("C++");
      } else if (skill === "C#") {
        const regex = /(?:^|[^a-zA-Z0-9+#])C\#(?:$|[^a-zA-Z0-9+#])/i;
        if (regex.test(line)) detectedSkills.add("C#");
      } else if (skill === "C") {
        const regex = /(?:^|[^a-zA-Z0-9+#])C(?:$|[^a-zA-Z0-9+#])/;
        if (regex.test(line)) detectedSkills.add("C");
      } else {
        const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, "i");
        if (regex.test(line)) {
          detectedSkills.add(skill);
        }
      }
    });
  });

  const skillsList = Array.from(detectedSkills);

  // 3. Flexible Section Header Detection
  const hasSummary = /(?:summary|profile|professional summary|objective|about me|overview|personal profile)/i.test(cleanText);
  const hasSkills = /(?:skills|technical skills|core skills|technologies|expertise|tools|core competencies|skills & competencies)/i.test(cleanText) || skillsList.length > 0;
  const hasExperience = /(?:experience|work experience|professional experience|employment history|work history|career history|employment|internships|internship experience)/i.test(cleanText);
  const hasEducation = /(?:education|academic background|qualifications|academic qualifications|academics|academic details|education & qualifications|educational details)/i.test(cleanText);
  const hasProjects = /(?:projects|personal projects|academic projects|relevant projects|key projects|portfolio|featured projects|technical projects)/i.test(cleanText);
  const hasContactInfo = /@|phone|\+?\d{10,12}|linkedin|github/i.test(cleanText);

  // 4. Extract Summary
  let summary = "";
  const summaryMatch = cleanText.match(
    /(?:summary|profile|professional summary|objective|about me|overview|personal profile)[\s:\n]+([\s\S]*?)(?=\n\s*(?:skills|technical skills|experience|work experience|education|academic|projects|employment|work history|$))/i
  );
  if (summaryMatch && summaryMatch[1] && summaryMatch[1].trim().length > 15) {
    summary = summaryMatch[1].trim().slice(0, 400);
  } else {
    const leadText = lines.slice(0, 3).filter((l) => !l.match(/resume|curriculum|cv/i)).join(" ");
    summary = leadText.slice(0, 300);
  }

  // 5. Extract Work Experience
  const experience: ParsedResumeResult["experience"] = [];
  if (hasExperience) {
    const expMatch = cleanText.match(
      /(?:experience|work experience|professional experience|employment history|work history|career history|employment|internships|internship experience)[\s:\n]+([\s\S]*?)(?=\n\s*(?:education|academic|projects|skills|technical skills|certifications|$))/i
    );

    if (expMatch && expMatch[1]) {
      const expLines = expMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      let currentExp: ParsedResumeResult["experience"][0] | null = null;

      expLines.forEach((line) => {
        const dateMatch = line.match(
          /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\b.*?(?:Present|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\b)/i
        );

        if (dateMatch || line.match(/\b(?:Engineer|Developer|Manager|Architect|Lead|Intern|Analyst|Associate|Consultant|Specialist)\b/i)) {
          if (currentExp) {
            experience.push(currentExp);
          }
          currentExp = {
            title: line,
            company: "Company / Organization",
            duration: dateMatch ? dateMatch[0] : "Duration Unspecified",
            bulletPoints: [],
          };
        } else if (currentExp) {
          if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
            currentExp.bulletPoints.push(line.replace(/^[•\-*]\s*/, ""));
          } else if (currentExp.bulletPoints.length < 5) {
            currentExp.bulletPoints.push(line);
          }
        }
      });

      if (currentExp) {
        experience.push(currentExp);
      }
    }
  }

  if (hasExperience && experience.length === 0) {
    experience.push({
      title: "Work Experience / Internships",
      company: "Listed in Resume",
      duration: "Verified",
      bulletPoints: ["Experience section detected in resume text."],
    });
  }

  // 6. Extract Education
  const education: ParsedResumeResult["education"] = [];
  if (hasEducation) {
    const eduMatch = cleanText.match(
      /(?:education|academic background|qualifications|academic qualifications|academics|academic details|education & qualifications|educational details)[\s:\n]+([\s\S]*?)(?=\n\s*(?:experience|work experience|projects|skills|technical skills|certifications|$))/i
    );

    if (eduMatch && eduMatch[1]) {
      const eduLines = eduMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      eduLines.forEach((line) => {
        const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
        education.push({
          degree: line,
          institution: "Academic Institution",
          year: yearMatch ? yearMatch[0] : "Graduation Year Unspecified",
        });
      });
    }
  }

  if (hasEducation && education.length === 0) {
    education.push({
      degree: "Degree / Academic Background",
      institution: "Educational Institution",
      year: "Verified",
    });
  }

  // 7. Extract Projects
  const projects: ParsedResumeResult["projects"] = [];
  if (hasProjects) {
    const projMatch = cleanText.match(
      /(?:projects|personal projects|academic projects|relevant projects|key projects|portfolio|featured projects|technical projects)[\s:\n]+([\s\S]*?)(?=\n\s*(?:education|academic|experience|work experience|skills|technical skills|certifications|$))/i
    );

    if (projMatch && projMatch[1]) {
      const projLines = projMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      let currentProj: ParsedResumeResult["projects"][0] | null = null;

      projLines.forEach((line) => {
        if (line.length > 3 && line.length < 80 && !line.startsWith("•") && !line.startsWith("-")) {
          if (currentProj) {
            projects.push(currentProj);
          }
          currentProj = {
            title: line,
            description: "",
            technologies: [],
          };
        } else if (currentProj) {
          currentProj.description += (currentProj.description ? " " : "") + line.replace(/^[•\-*]\s*/, "");
        }
      });

      if (currentProj) {
        projects.push(currentProj);
      }
    }
  }

  if (hasProjects && projects.length === 0) {
    projects.push({
      title: "Projects & Portfolio",
      description: "Project section detected in resume text.",
      technologies: skillsList.slice(0, 3),
    });
  }

  // 8. Standard ATS Section Checklist Verification
  const sectionChecklist = [
    {
      name: "Contact Information Header",
      key: "contact",
      found: hasContactInfo,
      scoreImpact: hasContactInfo ? "+10 pts" : "-10 pts",
      recommendation: hasContactInfo
        ? "Contact info (email/phone/links) identified successfully."
        : "Missing clear contact details or links (email, phone, LinkedIn). Add these at the top of your resume.",
    },
    {
      name: "Professional Summary / Profile",
      key: "summary",
      found: hasSummary,
      scoreImpact: hasSummary ? "+10 pts" : "-10 pts",
      recommendation: hasSummary
        ? "Professional summary section present."
        : "Missing a Professional Summary section header. Add a 3-sentence summary highlighting your core tech background.",
    },
    {
      name: "Technical Skills",
      key: "skills",
      found: hasSkills,
      scoreImpact: hasSkills ? "+20 pts" : "-20 pts",
      recommendation: hasSkills
        ? `${skillsList.length} relevant technical skills identified.`
        : "Missing a dedicated 'Skills' section. Group your tools and frameworks into an explicit Skills section.",
    },
    {
      name: "Work Experience Section",
      key: "experience",
      found: hasExperience,
      scoreImpact: hasExperience ? "+25 pts" : "-25 pts (Critical Impact)",
      recommendation: hasExperience
        ? "Work Experience section detected with entries."
        : "Missing explicit 'Work Experience' or 'Employment History' section header.",
    },
    {
      name: "Projects & Portfolio",
      key: "projects",
      found: hasProjects,
      scoreImpact: hasProjects ? "+15 pts" : "0 pts",
      recommendation: hasProjects
        ? "Projects section detected."
        : "Consider adding a dedicated 'Projects' section header with project names, descriptions, and technologies used.",
    },
    {
      name: "Education & Qualifications",
      key: "education",
      found: hasEducation,
      scoreImpact: hasEducation ? "+15 pts" : "-10 pts",
      recommendation: hasEducation
        ? "Education section identified."
        : "Missing clear 'Education' section header. Add your degree name, university, and graduation year.",
    },
  ];

  // 9. Unified Single Source of Truth ATS Score
  const atsScore = calculateUnifiedAtsScore({
    skillsCount: skillsList.length,
    hasSummary,
    hasExperience,
    hasEducation,
    hasProjects,
    hasSkills,
    hasContactInfo,
  });

  const sectionStructureScore = sectionChecklist.reduce((acc, curr) => acc + (curr.found ? 5 : 0), 0);
  const skillsCoverageScore = Math.min(30, skillsList.length * 4);
  const readabilityScore = Math.min(25, cleanText.length > 400 ? 25 : 15);
  const hasNumbers = /\b(?:\d+%|\$\d+|\d+\s*years|\d+\s*k)\b/i.test(cleanText);
  const impactMetricsScore = hasNumbers ? 15 : 5;

  // 10. Feedback Items
  const aiFeedback: ParsedResumeResult["aiFeedback"] = [];

  if (!hasExperience) {
    aiFeedback.push({
      type: "warning",
      title: "Missing 'Work Experience' Section Header",
      description: "The parser could not locate an explicit 'Work Experience' or 'Employment History' section header in your document.",
      actionableStep: "Add a section header labeled exactly 'Work Experience' or 'Professional Experience' above your work history.",
    });
  } else {
    aiFeedback.push({
      type: "strength",
      title: "Work Experience Section Identified",
      description: `Detected work experience section in your resume layout.`,
      actionableStep: "Ensure each position includes quantifiable achievement metrics (e.g., 'improved performance by 25%').",
    });
  }

  if (skillsList.length < 3) {
    aiFeedback.push({
      type: "warning",
      title: "Low Keyword & Skills Density",
      description: `Only ${skillsList.length} standard tech skill keywords were found in your text.`,
      actionableStep: "Create an explicit 'Technical Skills' section listing tools like C++, C, Java, Python, React, Node.js, Git, SQL, etc.",
    });
  } else {
    aiFeedback.push({
      type: "strength",
      title: "Technical Keyword Matches Identified",
      description: `Successfully identified ${skillsList.length} relevant skill keywords (${skillsList.slice(0, 5).join(", ")}) in your resume text.`,
      actionableStep: "Keep tech stack names spelled standardly (e.g. 'C++', 'Java', 'Python', 'React').",
    });
  }

  return {
    text: cleanText,
    summary,
    skills: skillsList,
    experience,
    education,
    projects,
    sectionChecklist,
    atsBreakdown: {
      sectionStructureScore,
      skillsCoverageScore,
      readabilityScore,
      impactMetricsScore,
    },
    aiFeedback,
    atsScore,
  };
};
