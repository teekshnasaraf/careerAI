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
  "React", "React.js", "TypeScript", "JavaScript", "JS", "Node.js", "Express", "Express.js",
  "MongoDB", "Python", "Django", "Flask", "Java", "Spring Boot", "C++", "C#", ".NET",
  "HTML", "HTML5", "CSS", "CSS3", "Tailwind CSS", "Tailwind", "SASS", "Redux", "GraphQL",
  "REST API", "RESTful APIs", "SQL", "PostgreSQL", "MySQL", "Redis", "Docker", "Kubernetes",
  "AWS", "Azure", "GCP", "Git", "GitHub", "Linux", "CI/CD", "Jest", "Cypress", "PyTorch",
  "TensorFlow", "OpenAI", "System Design", "Microservices", "Agile", "Scrum", "Figma",
  "Postman", "Web Development", "Frontend", "Backend", "Full Stack", "Machine Learning",
  "Data Analysis", "API Development", "Version Control", "Problem Solving"
];

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

export const parseResumeText = (rawText: string): ParsedResumeResult => {
  const cleanText = rawText.replace(/\r\n/g, "\n").trim();
  const lines = cleanText.split("\n").map((line) => line.trim()).filter(Boolean);

  // 1. Extract ONLY skills that ACTUALLY appear in raw document text (Zero Fake Defaults!)
  const detectedSkills = new Set<string>();
  DICTIONARY_SKILLS.forEach((skill) => {
    const escaped = skill.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, "i");
    if (regex.test(cleanText)) {
      detectedSkills.add(skill);
    }
  });

  const skillsList = Array.from(detectedSkills);

  // 2. Section Detection Patterns
  const hasSummary = /(?:summary|objective|profile|about me|overview|professional summary)/i.test(cleanText);
  const hasSkills = /(?:skills|technical skills|core competencies|expertise|technologies)/i.test(cleanText) || skillsList.length > 0;
  const hasExperience = /(?:work experience|professional experience|employment history|work history|experience)/i.test(cleanText);
  const hasEducation = /(?:education|academic background|qualifications|degrees|academic)/i.test(cleanText);
  const hasProjects = /(?:projects|personal projects|portfolio|key projects)/i.test(cleanText);
  const hasContactInfo = /@|phone|\+?\d{10,12}|linkedin|github/i.test(cleanText);

  // 3. Extract Summary
  let summary = "";
  const summaryMatch = cleanText.match(
    /(?:summary|objective|profile|about me|professional summary)[\s:\n]+([\s\S]*?)(?=\n\s*(?:skills|experience|education|projects|employment|work history|$))/i
  );
  if (summaryMatch && summaryMatch[1] && summaryMatch[1].trim().length > 15) {
    summary = summaryMatch[1].trim().slice(0, 350);
  } else {
    // If no explicit summary header found, take non-header introductory text
    const leadText = lines.slice(0, 3).filter(l => !l.match(/resume|curriculum|cv/i)).join(" ");
    summary = leadText.slice(0, 300);
  }

  // 4. Extract Work Experience (strictly from text)
  const experience: ParsedResumeResult["experience"] = [];
  if (hasExperience) {
    const expMatch = cleanText.match(
      /(?:work experience|professional experience|employment history|work history|experience)[\s:\n]+([\s\S]*?)(?=\n\s*(?:education|projects|skills|certifications|$))/i
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
            company: "Company / Employer",
            duration: dateMatch ? dateMatch[0] : "Duration Not Specified",
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

  // 5. Extract Education (strictly from text)
  const education: ParsedResumeResult["education"] = [];
  if (hasEducation) {
    const eduMatch = cleanText.match(
      /(?:education|academic background|qualifications)[\s:\n]+([\s\S]*?)(?=\n\s*(?:experience|projects|skills|certifications|$))/i
    );

    if (eduMatch && eduMatch[1]) {
      const eduLines = eduMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      eduLines.forEach((line) => {
        const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
        if (line.match(/\b(?:Bachelor|Master|B\.Tech|B\.E|B\.S|M\.S|Ph\.D|Diploma|Degree|University|College|Institute|School)\b/i)) {
          education.push({
            degree: line,
            institution: "Academic Institution",
            year: yearMatch ? yearMatch[0] : "Graduation Year Unspecified",
          });
        }
      });
    }
  }

  // 6. Extract Projects (strictly from text)
  const projects: ParsedResumeResult["projects"] = [];
  if (hasProjects) {
    const projMatch = cleanText.match(
      /(?:projects|personal projects|key projects|portfolio)[\s:\n]+([\s\S]*?)(?=\n\s*(?:education|experience|skills|certifications|$))/i
    );

    if (projMatch && projMatch[1]) {
      const projLines = projMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      let currentProj: ParsedResumeResult["projects"][0] | null = null;

      projLines.forEach((line) => {
        if (line.length > 4 && line.length < 65 && !line.startsWith("•") && !line.startsWith("-")) {
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

  // 7. Standard ATS Section Checklist Verification
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
      found: hasExperience && experience.length > 0,
      scoreImpact: (hasExperience && experience.length > 0) ? "+25 pts" : "-25 pts (Critical Impact)",
      recommendation: (hasExperience && experience.length > 0)
        ? "Work Experience section detected with bullet points."
        : "CRITICAL MISSING SECTION: 'Work Experience' or 'Employment History' section header was not detected. ATS filters heavily penalize resumes missing work experience headers.",
    },
    {
      name: "Projects & Portfolio",
      key: "projects",
      found: hasProjects && projects.length > 0,
      scoreImpact: (hasProjects && projects.length > 0) ? "+15 pts" : "0 pts",
      recommendation: (hasProjects && projects.length > 0)
        ? "Projects section detected."
        : "Consider adding a dedicated 'Projects' section header with project names, descriptions, and technologies used.",
    },
    {
      name: "Education & Qualifications",
      key: "education",
      found: hasEducation && education.length > 0,
      scoreImpact: (hasEducation && education.length > 0) ? "+15 pts" : "-10 pts",
      recommendation: (hasEducation && education.length > 0)
        ? "Education section identified."
        : "Missing clear 'Education' section header. Add your degree name, university, and graduation year.",
    },
  ];

  // 8. Calculate ATS Sub-Scores & Overall Score
  const sectionStructureScore = sectionChecklist.reduce((acc, curr) => acc + (curr.found ? 5 : 0), 0); // max 30
  const skillsCoverageScore = Math.min(30, skillsList.length * 4); // max 30
  const readabilityScore = Math.min(25, cleanText.length > 400 ? 25 : 15); // max 25
  const hasNumbers = /\b(?:\d+%|\$\d+|\d+\s*years|\d+\s*k)\b/i.test(cleanText);
  const impactMetricsScore = hasNumbers ? 15 : 5; // max 15

  const atsScore = sectionStructureScore + skillsCoverageScore + readabilityScore + impactMetricsScore;

  // 9. Elaborate Feedback Items (Why it scored X and how to improve)
  const aiFeedback: ParsedResumeResult["aiFeedback"] = [];

  if (!hasExperience || experience.length === 0) {
    aiFeedback.push({
      type: "warning",
      title: "Missing 'Work Experience' Section Header",
      description:
        "The parser could not locate an explicit 'Work Experience' or 'Employment History' section header in your document. ATS scanners check for standard headers to parse job titles and dates.",
      actionableStep:
        "Add a section header labeled exactly 'Work Experience' or 'Professional Experience' above your work history or internship listings.",
    });
  } else {
    aiFeedback.push({
      type: "strength",
      title: "Work Experience Section Identified",
      description: `Detected ${experience.length} work experience entry/entries in your resume layout.`,
      actionableStep: "Ensure each position includes quantifiable achievement metrics (e.g., 'improved performance by 25%').",
    });
  }

  if (skillsList.length < 5) {
    aiFeedback.push({
      type: "warning",
      title: "Low Keyword & Skills Density",
      description: `Only ${skillsList.length} standard tech skill keywords were found in your text. ATS algorithms rank candidates based on keyword frequency match.`,
      actionableStep:
        "Create an explicit 'Technical Skills' section listing tools like React, TypeScript, Node.js, Python, Git, Docker, REST APIs, etc.",
    });
  } else {
    aiFeedback.push({
      type: "strength",
      title: "Strong Technical Keyword Matches",
      description: `Successfully identified ${skillsList.length} relevant skill keywords in your resume text.`,
      actionableStep: "Keep tech stack names spelled standardly (e.g. 'React.js', 'TypeScript', 'Node.js').",
    });
  }

  if (!hasNumbers) {
    aiFeedback.push({
      type: "tip",
      title: "Missing Quantifiable Impact Metrics",
      description:
        "Your resume text does not contain percentage numbers, dollar amounts, or metric statistics (e.g. 'increased speed by 40%', 'reduced errors by 20%').",
      actionableStep:
        "Add numerical outcomes to your project and experience bullet points to demonstrate concrete business value to recruiters.",
    });
  } else {
    aiFeedback.push({
      type: "strength",
      title: "Quantifiable Impact Detected",
      description: "Found metrics and numbers in your bullet points, which enhances ATS impact ranking.",
      actionableStep: "Maintain percentage or efficiency metrics across all major bullet points.",
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
