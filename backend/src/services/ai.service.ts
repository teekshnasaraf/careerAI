import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { buildResumeAnalysisPayload, calculateUnifiedAtsScore } from "./resumeParser.service";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateAiContentWithFallback(prompt: string): Promise<string> {
  if (!ai) return "";
  const models = ["gemini-2.0-flash", "models/gemma-4-26b-a4b-it", "gemini-2.0-flash-lite"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying fallback... (${err?.message || err})`);
    }
  }
  return "";
}

export interface SingleAnalysisResult {
  resumeScore: number;
  atsScore: number;
  sectionScores: {
    summaryScore: number;
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    projectsScore: number;
  };
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
  recommendedKeywords: string[];
  actionVerbs: string[];
  formattingSuggestions: string[];
  topPriorityImprovements: string[];
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
  prioritySkills: string[];
  recommendedProjects: Array<{
    title: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    description: string;
    technologies: string[];
  }>;
  interviewTopics: string[];
  certificationSuggestions: string[];
  learningRoadmap: Array<{
    step: string;
    topic: string;
    priority: "High" | "Medium" | "Low";
    estimatedHours: number;
    prerequisites: string[];
    details: string;
    recommendedResource: string;
    weeklyPlan: string[];
  }>;
}

export const generateResumeAnalysis = async (
  resumeText: string,
  parsedData?: any
): Promise<SingleAnalysisResult> => {
  if (ai) {
    try {
      const prompt = `You are a Senior Recruiter & Lead ATS System Architect. Analyze this candidate's resume and generate a single source of truth analysis JSON object.

RESUME FULL TEXT:
"""
${resumeText.slice(0, 5000)}
"""

Extracted Summary: ${JSON.stringify(parsedData?.summary || "")}
Extracted Skills: ${JSON.stringify(parsedData?.skills || [])}
Extracted Experience Count: ${parsedData?.experience?.length || 0}
Extracted Education Count: ${parsedData?.education?.length || 0}
Extracted Projects Count: ${parsedData?.projects?.length || 0}

Evaluate and return ONLY a valid JSON object without Markdown backticks:
{
  "resumeScore": 85,
  "atsScore": 80,
  "sectionScores": {
    "summaryScore": 85,
    "skillsScore": 80,
    "experienceScore": 75,
    "educationScore": 90,
    "projectsScore": 80
  },
  "sectionAnalysis": {
    "summary": "Detailed evaluation of summary based on resume text",
    "skills": "Detailed evaluation of technical skills found",
    "education": "Detailed evaluation of education background",
    "projects": "Detailed evaluation of projects section",
    "experience": "Detailed evaluation of work experience section"
  },
  "strengths": ["Strength 1 from resume", "Strength 2"],
  "weaknesses": ["Weakness 1 from resume", "Weakness 2"],
  "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2"],
  "missingSkills": ["Missing skill 1", "Missing skill 2"],
  "recommendedKeywords": ["Keyword 1", "Keyword 2"],
  "actionVerbs": ["Architected", "Spearheaded", "Optimized"],
  "formattingSuggestions": ["Use bullet points for experience", "Keep margins clean"],
  "topPriorityImprovements": ["Add Work Experience header", "Include percentage metrics"]
}`;

      const text = await generateAiContentWithFallback(prompt);
      if (text) {
        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);

        const scoringPayload = buildResumeAnalysisPayload({
          summary: parsedData?.summary,
          skills: parsedData?.skills || [],
          experience: parsedData?.experience || [],
          education: parsedData?.education || [],
          projects: parsedData?.projects || [],
          atsScore: parsed.atsScore,
        });

        return {
          ...scoringPayload,
          strengths: parsed.strengths || scoringPayload.strengths,
          weaknesses: parsed.weaknesses || scoringPayload.weaknesses,
          suggestions: parsed.suggestions || scoringPayload.suggestions,
          missingSkills: parsed.missingSkills || scoringPayload.missingSkills,
          recommendedKeywords: parsed.recommendedKeywords || scoringPayload.recommendedKeywords,
          actionVerbs: parsed.actionVerbs || scoringPayload.actionVerbs,
          formattingSuggestions: parsed.formattingSuggestions || scoringPayload.formattingSuggestions,
          topPriorityImprovements: parsed.topPriorityImprovements || scoringPayload.topPriorityImprovements,
        };
      }
    } catch (err) {
      console.error("AI evaluation error:", err);
    }
  }

  // Dynamic Rule-Based Calculation (Single Source of Truth Fallback)
  const actualSkills = parsedData?.skills || [];
  const skillsCount = actualSkills.length;
  const hasExp = (parsedData?.experience?.length || 0) > 0;
  const hasEdu = (parsedData?.education?.length || 0) > 0;
  const hasProj = (parsedData?.projects?.length || 0) > 0;

  const atsScore = calculateUnifiedAtsScore({
    skillsCount,
    hasSummary: Boolean(parsedData?.summary),
    hasExperience: hasExp,
    hasEducation: hasEdu,
    hasProjects: hasProj,
    hasSkills: skillsCount > 0,
    hasContactInfo: true,
  });

  return buildResumeAnalysisPayload({
    summary: parsedData?.summary,
    skills: actualSkills,
    experience: parsedData?.experience || [],
    education: parsedData?.education || [],
    projects: parsedData?.projects || [],
    atsScore,
  });
};

export const improveResumeSection = async (
  sectionType: string,
  content: string,
  resumeContext?: string,
  targetRole?: string,
  atsWeaknesses?: string[]
): Promise<AiSectionImprovementResult> => {
  if (ai) {
    try {
      const prompt = `You are an Executive Resume Writer & Technical Recruiter. Rewrite and improve the following ${sectionType} section for candidate targeting the role "${targetRole || "Software Engineer"}".

CANDIDATE RESUME CONTEXT:
"""
${(resumeContext || "").slice(0, 2500)}
"""

KNOWN ATS WEAKNESSES TO FIX:
${JSON.stringify(atsWeaknesses || [])}

DRAFT SECTION CONTENT TO REWRITE:
"${content}"

Rewrite the content to make it punchy, high-impact, and ATS optimized with strong action verbs and metric placeholders.

Return ONLY a single valid JSON object without Markdown backticks:
{
  "improvedContent": "Rewritten high-impact content here...",
  "keyChanges": ["Used strong action verbs", "Added metric placeholders", "Aligned with target role keywords"]
}`;

      const text = await generateAiContentWithFallback(prompt);
      if (text) {
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
          improvedContent: parsed.improvedContent || content,
          keyChanges: parsed.keyChanges || ["Enhanced action verbs", "Optimized phrasing"],
        };
      }
    } catch (err) {
      console.error("AI Section Improvement error:", err);
    }
  }

  const trimmed = content.trim();
  return {
    improvedContent: `Architected and optimized ${trimmed || "key software components"}, driving a 30% increase in application efficiency and aligning with ${targetRole || "engineering"} benchmarks.`,
    keyChanges: ["Added strong introductory action verb", "Inserted quantifiable performance metric placeholder"],
  };
};

export const generateSkillGapAnalysis = async (
  resumeSkills: string[],
  targetRole: string,
  resumeContext?: string
): Promise<AiSkillGapResult> => {
  const normalizedRole = targetRole.trim();

  if (ai) {
    try {
      const prompt = `You are a Lead AI Career Mentor. Generate a highly specific, non-generic skill gap analysis and learning roadmap comparing candidate's actual resume skills against standard requirements for "${normalizedRole}".

CANDIDATE ACTUAL SKILLS: ${JSON.stringify(resumeSkills)}
RESUME CONTEXT SUMMARY: "${(resumeContext || "").slice(0, 2000)}"
TARGET ROLE: "${normalizedRole}"

Instructions:
Generate role-specific topics:
- If Frontend: HTML -> CSS -> JavaScript -> React -> Next.js -> Web Vitals & Accessibility -> Cloud Deployment
- If Backend: Node.js -> Express -> Auth/JWT -> MongoDB/PostgreSQL -> Redis Caching -> System Architecture -> Cloud Deployment
- If Cybersecurity: Networking Fundamentals -> Linux Hardening -> OWASP Top 10 -> Web Penetration Testing -> SIEM & Incident Response
- If AI/ML: Python -> NumPy/Pandas -> Scikit-Learn -> PyTorch/TensorFlow -> Transformers & LLMs -> MLOps
- If DevOps: Linux -> Docker -> Kubernetes -> AWS -> CI/CD GitHub Actions -> Terraform -> Prometheus

Return ONLY a single valid JSON object in this format without Markdown backticks:
{
  "targetRole": "${normalizedRole}",
  "matchingScore": 72,
  "missingSkills": ["Missing Skill 1", "Missing Skill 2"],
  "missingTechnologies": ["Tech 1", "Tech 2"],
  "prioritySkills": ["High Priority Skill 1", "High Priority Skill 2"],
  "recommendedProjects": [
    {
      "title": "Project Title",
      "difficulty": "Intermediate",
      "description": "Full description of project to build",
      "technologies": ["React", "Node.js"]
    }
  ],
  "interviewTopics": ["System Design", "State Management", "REST Architecture"],
  "certificationSuggestions": ["AWS Certified Developer", "Meta Frontend Specialization"],
  "learningRoadmap": [
    {
      "step": "Week 1: Core Fundamentals",
      "topic": "Topic Name",
      "priority": "High",
      "estimatedHours": 10,
      "prerequisites": ["Basic JS"],
      "details": "Explanation of topics to master",
      "recommendedResource": "Official Documentation",
      "weeklyPlan": ["Day 1: Theory", "Day 2: Coding Practice", "Day 3: Mini Project"]
    }
  ]
}`;

      const text = await generateAiContentWithFallback(prompt);
      if (text) {
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
          targetRole: normalizedRole,
          matchingScore: parsed.matchingScore || 70,
          missingSkills: parsed.missingSkills || [],
          missingTechnologies: parsed.missingTechnologies || [],
          prioritySkills: parsed.prioritySkills || [],
          recommendedProjects: parsed.recommendedProjects || [],
          interviewTopics: parsed.interviewTopics || [],
          certificationSuggestions: parsed.certificationSuggestions || [],
          learningRoadmap: parsed.learningRoadmap || [],
        };
      }
    } catch (err) {
      console.error("AI Skill Gap Analysis error:", err);
    }
  }

  // Dynamic Rule-Based Skill Gap Engine
  return {
    targetRole: normalizedRole,
    matchingScore: Math.min(95, Math.max(40, 45 + resumeSkills.length * 5)),
    missingSkills: [`Advanced ${normalizedRole} Principles`, "Production Architecture"],
    missingTechnologies: ["Docker", "AWS / Cloud Infrastructure"],
    prioritySkills: [`Master ${normalizedRole} Core Stack`, "Build Capstone Project"],
    recommendedProjects: [
      {
        title: `${normalizedRole} Production Platform`,
        difficulty: "Intermediate",
        description: `Build an end-to-end scalable application tailored for ${normalizedRole} requirements.`,
        technologies: resumeSkills.slice(0, 3),
      },
    ],
    interviewTopics: [`${normalizedRole} Architecture`, "State & Performance Tuning", "Security Best Practices"],
    certificationSuggestions: [`AWS Certified ${normalizedRole}`, "Professional Tech Certification"],
    learningRoadmap: [
      {
        step: "Week 1: Foundations",
        topic: `${normalizedRole} Core Fundamentals`,
        priority: "High",
        estimatedHours: 12,
        prerequisites: resumeSkills.slice(0, 2),
        details: `Study core syntax, architecture patterns, and tools required for ${normalizedRole}.`,
        recommendedResource: "Official Documentation & FreeCodeCamp",
        weeklyPlan: ["Day 1-2: Core Concepts", "Day 3-4: Hands-on Code", "Day 5-7: Mini Project"],
      },
    ],
  };
};
