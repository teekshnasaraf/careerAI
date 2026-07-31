import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface AiResumeAnalysisResult {
  resumeScore: number;
  atsScore: number;
  sectionAnalysis: {
    summary: string;
    skills: string;
    education: string;
    projects: string;
    experience: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingSkills: string[];
}

export interface AiSectionImprovementResult {
  improvedContent: string;
  keyChanges: string[];
}

export interface AiSkillGapResult {
  targetRole: string;
  matchingScore: number;
  missingSkills: string[];
  missingTechnologies: string[];
  learningPriority: string[];
  learningRoadmap: Array<{
    step: string;
    topic: string;
    details: string;
    recommendedResource: string;
  }>;
}

export const generateResumeAnalysis = async (
  resumeText: string,
  parsedData?: any
): Promise<AiResumeAnalysisResult> => {
  if (ai) {
    try {
      const prompt = `You are an expert AI Resume Reviewer & Senior Recruiter ATS Engine. Analyze the following resume text and provide a structured JSON response.

RESUME TEXT:
"""
${resumeText.slice(0, 4000)}
"""

Parsed Data Summary: ${JSON.stringify(parsedData?.summary || "")}
Detected Skills: ${JSON.stringify(parsedData?.skills || [])}

Respond strictly with a single valid JSON object in this exact format without Markdown backticks:
{
  "resumeScore": 82,
  "atsScore": 78,
  "sectionAnalysis": {
    "summary": "Analysis of summary section",
    "skills": "Analysis of technical skills section",
    "education": "Analysis of education section",
    "projects": "Analysis of projects section",
    "experience": "Analysis of work experience section"
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "missingSkills": ["Missing Skill 1", "Missing Skill 2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);

      return {
        resumeScore: parsed.resumeScore || 80,
        atsScore: parsed.atsScore || 75,
        sectionAnalysis: {
          summary: parsed.sectionAnalysis?.summary || "Summary parsed.",
          skills: parsed.sectionAnalysis?.skills || "Skills evaluated.",
          education: parsed.sectionAnalysis?.education || "Education checked.",
          projects: parsed.sectionAnalysis?.projects || "Projects evaluated.",
          experience: parsed.sectionAnalysis?.experience || "Experience reviewed.",
        },
        strengths: parsed.strengths || ["Clean structure", "Relevant tech stack"],
        weaknesses: parsed.weaknesses || ["Could add more quantifiable metrics"],
        suggestions: parsed.suggestions || ["Add action verbs to bullet points"],
        missingSkills: parsed.missingSkills || ["CI/CD Pipelines", "Docker", "Unit Testing"],
      };
    } catch (err) {
      console.error("Gemini API call failed, falling back to rule-based analysis:", err);
    }
  }

  // Smart Heuristic Fallback Analysis if API key is not present or fails
  const skillsCount = parsedData?.skills?.length || 0;
  const hasExperience = parsedData?.experience?.length > 0;
  const hasProjects = parsedData?.projects?.length > 0;

  const calculatedAts = Math.min(95, Math.max(55, 60 + skillsCount * 3 + (hasExperience ? 15 : 0)));
  const calculatedResume = Math.min(98, Math.max(60, calculatedAts + 5));

  return {
    resumeScore: calculatedResume,
    atsScore: calculatedAts,
    sectionAnalysis: {
      summary: parsedData?.summary
        ? "Professional summary is present and concise."
        : "Missing an explicit Summary section header. Add a 3-sentence summary at the top.",
      skills: `Extracted ${skillsCount} technical skills. Grouping by categories (Frontend, Backend, Database) improves recruiter readability.`,
      education: parsedData?.education?.length
        ? "Education section identified with degree and institution details."
        : "Add clear degree title and graduation year.",
      projects: hasProjects
        ? `Found ${parsedData.projects.length} project entry/entries.`
        : "Adding personal or academic projects demonstrates practical experience.",
      experience: hasExperience
        ? `Found ${parsedData.experience.length} work history entries.`
        : "Work Experience section header was not detected. Adding an explicit Work Experience header will increase ATS matching.",
    },
    strengths: [
      skillsCount > 0 ? `Identified ${skillsCount} core technical skills` : "Clear document font and layout",
      hasProjects ? "Includes project portfolio demonstrations" : "Extractable text format",
      "Compatible standard document margins",
    ],
    weaknesses: [
      !hasExperience ? "Missing explicit Work Experience section header" : "Could include more quantifiable percentage metrics",
      skillsCount < 8 ? "Technical keyword density is below senior recruiter benchmarks" : "Project descriptions could highlight business impact",
    ],
    suggestions: [
      "Use strong action verbs like 'Architected', 'Spearheaded', and 'Optimized' at the start of bullet points.",
      "Add quantifiable outcomes (e.g. 'improved performance by 35%').",
      "Include missing industry keywords like Docker, CI/CD, and System Architecture.",
    ],
    missingSkills: ["Docker & Containers", "CI/CD Pipelines", "Jest / Unit Testing", "AWS / Cloud Infrastructure"],
  };
};

export const improveResumeSection = async (
  sectionType: string,
  content: string
): Promise<AiSectionImprovementResult> => {
  if (ai) {
    try {
      const prompt = `You are a professional resume editor. Rewrite and improve the following ${sectionType} section to make it punchy, high-impact, and ATS optimized with strong action verbs and quantified achievements.

ORIGINAL CONTENT:
"${content}"

Return a JSON object in this exact format without backticks:
{
  "improvedContent": "Rewritten high-impact content here...",
  "keyChanges": ["Changed active verbs", "Added metric placeholders", "Enhanced ATS keyword flow"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        improvedContent: parsed.improvedContent || content,
        keyChanges: parsed.keyChanges || ["Enhanced action verbs", "Optimized phrasing"],
      };
    } catch (err) {
      console.error("Gemini Section Improvement failed:", err);
    }
  }

  // Heuristic Fallback for Section Improvement
  return {
    improvedContent: `Architected and optimized ${content || "key software components"}, driving a 30% increase in application efficiency and streamlining cross-functional team workflows.`,
    keyChanges: [
      "Added strong action verbs (Architected, Optimized)",
      "Inserted quantifiable performance metric (+30%)",
      "Improved ATS keyword alignment",
    ],
  };
};

export const generateSkillGapAnalysis = async (
  resumeSkills: string[],
  targetRole: string
): Promise<AiSkillGapResult> => {
  if (ai) {
    try {
      const prompt = `Compare candidate's current skills against the target job role "${targetRole}".

CANDIDATE SKILLS: ${JSON.stringify(resumeSkills)}

Return a single JSON object in this exact format without backticks:
{
  "targetRole": "${targetRole}",
  "matchingScore": 75,
  "missingSkills": ["Docker", "Kubernetes", "GraphQL"],
  "missingTechnologies": ["Redis", "AWS Lambda"],
  "learningPriority": ["Master Docker & Containerization", "Learn AWS Cloud Basics", "Implement GraphQL APIs"],
  "learningRoadmap": [
    {
      "step": "Week 1-2",
      "topic": "Docker & Container Basics",
      "details": "Learn containerization, Dockerfiles, and multi-container docker-compose setups.",
      "recommendedResource": "Official Docker Documentation & FreeCodeCamp"
    },
    {
      "step": "Week 3-4",
      "topic": "Cloud Deployment & AWS",
      "details": "Deploy Node/React apps to AWS EC2, S3, and setup CloudFront CDN.",
      "recommendedResource": "AWS Certified Cloud Practitioner Guide"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        targetRole,
        matchingScore: parsed.matchingScore || 75,
        missingSkills: parsed.missingSkills || ["Docker", "Kubernetes", "AWS"],
        missingTechnologies: parsed.missingTechnologies || ["Redis", "GraphQL"],
        learningPriority: parsed.learningPriority || ["Containerization", "Cloud Architecture"],
        learningRoadmap: parsed.learningRoadmap || [],
      };
    } catch (err) {
      console.error("Gemini Skill Gap Analysis failed:", err);
    }
  }

  // Heuristic Skill Gap Analysis Fallback
  const missingTech = ["Docker & Containers", "AWS / Cloud Infrastructure", "CI/CD & GitHub Actions", "System Design & Microservices"];

  return {
    targetRole: targetRole || "Full Stack Engineer",
    matchingScore: Math.min(88, Math.max(50, 60 + resumeSkills.length * 3)),
    missingSkills: missingTech.slice(0, 3),
    missingTechnologies: ["Redis Cache", "GraphQL", "Kubernetes"],
    learningPriority: [
      "1. Master Docker Containerization",
      "2. Learn AWS/Cloud App Deployment",
      "3. Implement CI/CD Automated Pipelines",
    ],
    learningRoadmap: [
      {
        step: "Week 1: Containerization",
        topic: "Docker Fundamentals",
        details: "Build Docker images for Node.js backend and React frontend applications.",
        recommendedResource: "Docker Mastery on Udemy / FreeCodeCamp Docker Tutorial",
      },
      {
        step: "Week 2: Cloud Services",
        topic: "AWS S3 & EC2 Deployment",
        details: "Deploy full stack apps to AWS EC2 instance with NGINX reverse proxy.",
        recommendedResource: "AWS Developer Guide",
      },
      {
        step: "Week 3: CI/CD Automation",
        topic: "GitHub Actions",
        details: "Set up automated test and build workflows on every push to main.",
        recommendedResource: "GitHub Actions Documentation",
      },
    ],
  };
};
