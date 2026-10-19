import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { canonicalizeSkillName } from "../data/skills/skillDependencyGraph";
import { IAssessedSkillSummary, IInterviewResponse } from "../models/InterviewSession";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function callGeminiWithFallback(prompt: string): Promise<string> {
  if (!ai || process.env.NODE_ENV === "test") return "";
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "models/gemma-4-26b-a4b-it", "gemini-2.0-flash-lite"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      if (response.text) return response.text;
    } catch (err: any) {
      console.warn(`Model ${model} failed in adaptive interview service: ${err?.message || err}`);
    }
  }
  return "";
}

export type InterviewDifficulty = "Easy" | "Medium" | "Hard";
export type AdaptiveNextAction = "follow_up" | "harder_question" | "easier_question" | "next_skill" | "finish";

export interface EvaluationRubricScores {
  technicalCorrectness: number; // weight: 0.30
  accuracy: number;             // weight: 0.20
  depth: number;                // weight: 0.20
  practicalApplication: number; // weight: 0.15
  communication: number;        // weight: 0.15
  overallScore: number;         // weighted composite: 0 - 100
}

export interface AdaptiveAnswerEvaluation {
  questionId: string;
  questionText: string;
  skill: string;
  userAnswer: string;
  rubric: EvaluationRubricScores;
  strengths: string[];
  gaps: string[];
  suggestedImprovement: string;
  betterAnswer: string;
  difficultyRating: InterviewDifficulty;
  recommendedAction: AdaptiveNextAction;
}

export interface AdaptiveDecision {
  nextAction: AdaptiveNextAction;
  targetSkill: string;
  nextDifficulty: InterviewDifficulty;
  reason: string;
  followupDepth: number;
}

export interface AdaptiveQuestion {
  questionId: string;
  text: string;
  category: string;
  skill: string;
  difficulty: InterviewDifficulty;
  isFollowup: boolean;
  parentQuestionId?: string;
  followupReason?: string;
  resumeReference?: string;
}

export interface PrioritizedTopic {
  skill: string;
  priorityWeight: number;
  source: "required_job_skill" | "preferred_job_skill" | "roadmap_gap" | "resume_verified" | "role_core";
}

/**
 * Normalizes skill name to canonical taxonomy entry.
 */
export function normalizeSkillName(rawName: string): string {
  return canonicalizeSkillName(rawName);
}

/**
 * Computes deterministic weighted overall score across the 5 evaluation dimensions.
 */
export function calculateRubricComposite(scores: {
  technicalCorrectness: number;
  accuracy: number;
  depth: number;
  practicalApplication: number;
  communication: number;
}): EvaluationRubricScores {
  const clamp = (val: number) => Math.min(100, Math.max(0, Math.round(val)));

  const technicalCorrectness = clamp(scores.technicalCorrectness);
  const accuracy = clamp(scores.accuracy);
  const depth = clamp(scores.depth);
  const practicalApplication = clamp(scores.practicalApplication);
  const communication = clamp(scores.communication);

  const weighted =
    technicalCorrectness * 0.3 +
    accuracy * 0.2 +
    depth * 0.2 +
    practicalApplication * 0.15 +
    communication * 0.15;

  const overallScore = clamp(Math.round(weighted));

  return {
    technicalCorrectness,
    accuracy,
    depth,
    practicalApplication,
    communication,
    overallScore,
  };
}

/**
 * Builds a prioritized topic queue from JD requirements, roadmap gaps, and resume skills.
 */
export function prioritizeInterviewTopics(params: {
  targetRole: string;
  jobRequiredSkills?: string[];
  jobPreferredSkills?: string[];
  jobUnspecifiedSkills?: string[];
  roadmapMissingSkills?: string[];
  roadmapPrerequisites?: string[];
  resumeSkills?: string[];
  assessedSkills?: string[];
}): string[] {
  const topicMap = new Map<string, number>();

  const addSkillWithWeight = (rawSkill: string, weight: number) => {
    const canonical = normalizeSkillName(rawSkill);
    if (!canonical) return;
    const current = topicMap.get(canonical) || 0;
    if (weight > current) {
      topicMap.set(canonical, weight);
    }
  };

  // 1. Direct required job skills (highest priority: 4.0)
  (params.jobRequiredSkills || []).forEach((s) => addSkillWithWeight(s, 4.0));

  // 2. Roadmap missing prerequisites & unmet skills (priority: 3.5)
  (params.roadmapMissingSkills || []).forEach((s) => addSkillWithWeight(s, 3.5));
  (params.roadmapPrerequisites || []).forEach((s) => addSkillWithWeight(s, 3.2));

  // 3. Direct unspecified job requirements (priority: 2.5)
  (params.jobUnspecifiedSkills || []).forEach((s) => addSkillWithWeight(s, 2.5));

  // 4. Preferred job requirements (priority: 2.0)
  (params.jobPreferredSkills || []).forEach((s) => addSkillWithWeight(s, 2.0));

  // 5. Resume demonstrated skills (to verify actual depth: priority: 1.8)
  (params.resumeSkills || []).forEach((s) => addSkillWithWeight(s, 1.8));

  // Fallback if no skills discovered: Role-specific standard core skills
  if (topicMap.size === 0) {
    const roleLower = params.targetRole.toLowerCase();
    if (roleLower.includes("frontend")) {
      ["JavaScript", "TypeScript", "React", "HTML", "CSS", "Next.js"].forEach((s) => addSkillWithWeight(s, 2.0));
    } else if (roleLower.includes("backend")) {
      ["Node.js", "Express.js", "PostgreSQL", "REST APIs", "System Design", "MongoDB"].forEach((s) =>
        addSkillWithWeight(s, 2.0)
      );
    } else if (roleLower.includes("devops") || roleLower.includes("cloud")) {
      ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Git"].forEach((s) => addSkillWithWeight(s, 2.0));
    } else if (roleLower.includes("ai") || roleLower.includes("ml") || roleLower.includes("data")) {
      ["Python", "Machine Learning", "SQL", "PyTorch", "Data Science Fundamentals"].forEach((s) =>
        addSkillWithWeight(s, 2.0)
      );
    } else {
      ["JavaScript", "TypeScript", "Data Structures", "Algorithms", "System Design", "SQL"].forEach((s) =>
        addSkillWithWeight(s, 2.0)
      );
    }
  }

  // Assessed skills receive a downward penalty so unassessed skills are prioritized first
  const assessedSet = new Set((params.assessedSkills || []).map((s) => normalizeSkillName(s)));

  const sorted = Array.from(topicMap.entries()).sort((a, b) => {
    const aAssessed = assessedSet.has(a[0]);
    const bAssessed = assessedSet.has(b[0]);
    if (aAssessed !== bAssessed) {
      return aAssessed ? 1 : -1; // unassessed comes first
    }
    if (b[1] !== a[1]) {
      return b[1] - a[1]; // higher priority weight first
    }
    return a[0].localeCompare(b[0]); // deterministic alphabetical tie-breaking
  });

  return sorted.map((entry) => entry[0]);
}

/**
 * Deterministic Adaptive Question Selection Algorithm.
 * Implements explicit decision policy thresholds:
 * - Score >= 80: Strong -> Harder question or advance to next topic at high difficulty
 * - 60 <= Score < 80: Partially correct -> Target follow-up probing gap (up to max depth 2)
 * - Score < 60: Weak -> Drop difficulty to test foundational knowledge or rotate after gap recorded
 */
export function determineNextAdaptiveAction(params: {
  lastEvaluationScore: number;
  lastSkill: string;
  currentDifficulty: InterviewDifficulty;
  followupDepth: number;
  maxFollowupDepth?: number;
  currentQuestionCount: number;
  maxQuestions: number;
  assessedSkills: IAssessedSkillSummary[];
  unassessedSkills: string[];
}): AdaptiveDecision {
  const maxDepth = params.maxFollowupDepth ?? 2;
  const currentCount = params.currentQuestionCount;
  const budget = params.maxQuestions;

  // 1. Stopping Condition: Budget exhausted
  if (currentCount >= budget) {
    return {
      nextAction: "finish",
      targetSkill: params.lastSkill,
      nextDifficulty: params.currentDifficulty,
      reason: `Reached maximum interview question budget of ${budget} questions.`,
      followupDepth: 0,
    };
  }

  // Count how many questions were already asked on this specific skill
  const skillAssessed = params.assessedSkills.find(
    (s) => s.skill.toLowerCase() === params.lastSkill.toLowerCase()
  );
  const questionsOnThisSkill = skillAssessed ? skillAssessed.questionsCount : 1;

  // Next available unassessed skill (or fallback to an assessed skill with gaps)
  const remainingUnassessed = params.unassessedSkills.filter(
    (s) => s.toLowerCase() !== params.lastSkill.toLowerCase()
  );
  const nextCandidateSkill = remainingUnassessed[0] || params.lastSkill;

  // 2. Policy: Strong Performance (Score >= 80)
  if (params.lastEvaluationScore >= 80) {
    if (params.currentDifficulty === "Easy") {
      // Step up to Medium
      return {
        nextAction: "harder_question",
        targetSkill: params.lastSkill,
        nextDifficulty: "Medium",
        reason: `Candidate demonstrated strong foundational understanding on ${params.lastSkill} (score: ${params.lastEvaluationScore}%); advancing to Medium difficulty to assess applied problem-solving.`,
        followupDepth: 0,
      };
    } else if (params.currentDifficulty === "Medium") {
      if (questionsOnThisSkill < 2 && remainingUnassessed.length > 0) {
        // Probe at Hard difficulty to test senior ceiling
        return {
          nextAction: "harder_question",
          targetSkill: params.lastSkill,
          nextDifficulty: "Hard",
          reason: `Candidate provided an excellent technical answer on ${params.lastSkill} (score: ${params.lastEvaluationScore}%); advancing to Hard difficulty to assess architectural depth and scale trade-offs.`,
          followupDepth: 0,
        };
      } else {
        // Competency verified on this skill; rotate to next high-priority skill
        return {
          nextAction: "next_skill",
          targetSkill: nextCandidateSkill,
          nextDifficulty: "Medium",
          reason: `High competency verified on ${params.lastSkill}; rotating to assess next prioritized skill: ${nextCandidateSkill}.`,
          followupDepth: 0,
        };
      }
    } else {
      // Already at Hard difficulty with score >= 80 -> Peak mastery verified! Rotate to next skill
      return {
        nextAction: "next_skill",
        targetSkill: nextCandidateSkill,
        nextDifficulty: "Medium",
        reason: `Senior architectural mastery demonstrated on ${params.lastSkill} at Hard difficulty; rotating to assess next prioritized skill: ${nextCandidateSkill}.`,
        followupDepth: 0,
      };
    }
  }

  // 3. Policy: Partially Correct / Gaps (60 <= Score < 80)
  if (params.lastEvaluationScore >= 60 && params.lastEvaluationScore < 80) {
    if (params.followupDepth < maxDepth) {
      return {
        nextAction: "follow_up",
        targetSkill: params.lastSkill,
        nextDifficulty: params.currentDifficulty,
        reason: `Answer on ${params.lastSkill} was partially complete (score: ${params.lastEvaluationScore}%) but missed specific edge cases or depth; probing with a targeted follow-up question.`,
        followupDepth: params.followupDepth + 1,
      };
    } else {
      // Reached maximum follow-up depth on this skill; advance to next skill to preserve interview breadth
      return {
        nextAction: "next_skill",
        targetSkill: nextCandidateSkill,
        nextDifficulty: params.currentDifficulty,
        reason: `Concluded follow-up investigation on ${params.lastSkill} (max depth ${maxDepth} reached); advancing to next prioritized skill: ${nextCandidateSkill}.`,
        followupDepth: 0,
      };
    }
  }

  // 4. Policy: Weak / Incomplete Answer (Score < 60)
  if (params.currentDifficulty === "Hard") {
    return {
      nextAction: "easier_question",
      targetSkill: params.lastSkill,
      nextDifficulty: "Medium",
      reason: `Candidate struggled with complex architecture on ${params.lastSkill} (score: ${params.lastEvaluationScore}%); reducing difficulty to Medium to evaluate standard practical implementations.`,
      followupDepth: 0,
    };
  } else if (params.currentDifficulty === "Medium") {
    if (questionsOnThisSkill < 2) {
      return {
        nextAction: "easier_question",
        targetSkill: params.lastSkill,
        nextDifficulty: "Easy",
        reason: `Candidate struggled with practical implementation on ${params.lastSkill} (score: ${params.lastEvaluationScore}%); reducing difficulty to Easy to verify foundational principles.`,
        followupDepth: 0,
      };
    } else {
      return {
        nextAction: "next_skill",
        targetSkill: nextCandidateSkill,
        nextDifficulty: "Medium",
        reason: `Identified knowledge gap on ${params.lastSkill}; recording gap and rotating to next prioritized skill: ${nextCandidateSkill} to maintain assessment breadth.`,
        followupDepth: 0,
      };
    }
  } else {
    // Already at Easy and score < 60: Foundational gap recorded; avoid indefinite looping on weak skill
    return {
      nextAction: "next_skill",
      targetSkill: nextCandidateSkill,
      nextDifficulty: "Medium",
      reason: `Foundational gap recorded for ${params.lastSkill}; advancing to next prioritized skill: ${nextCandidateSkill} to assess broader competency.`,
      followupDepth: 0,
    };
  }
}

/**
 * Curated question bank for taxonomy skills across Easy, Medium, and Hard difficulty tiers.
 * Used for instant deterministic fallback when AI is unconfigured or rate-limited.
 */
export const CURATED_QUESTION_BANK: Record<
  string,
  { Easy: string[]; Medium: string[]; Hard: string[] }
> = {
  JavaScript: {
    Easy: [
      "Explain the difference between 'var', 'let', and 'const' in JavaScript, including scoping and hoisting behavior.",
      "What are JavaScript primitive types versus reference types, and how are they passed in function calls?",
    ],
    Medium: [
      "Explain the JavaScript Event Loop, Call Stack, Microtask queue (Promises), and Macrotask queue (setTimeout).",
      "How does prototypal inheritance work in JavaScript, and how do ES6 classes map to prototypes under the hood?",
    ],
    Hard: [
      "How would you design a memory-leak detection and profiling strategy in a long-running Node.js or high-throughput V8 process?",
      "Implement a custom Promise.allSettled and Promise.race with complete concurrency control and cancellation support.",
    ],
  },
  TypeScript: {
    Easy: [
      "What is the core difference between TypeScript 'interface' and 'type' alias, and when should you prefer one over the other?",
      "Explain how TypeScript type inference works with primitive variables and function return types.",
    ],
    Medium: [
      "Explain TypeScript Generics and how you can constrain generic parameters using the 'extends' keyword.",
      "How do union types, intersection types, and type guards ('typeof', 'instanceof', custom predicates) work in TypeScript?",
    ],
    Hard: [
      "How do mapped types, conditional types, and the 'infer' keyword enable advanced utility types like DeepPartial or ReturnType?",
      "Design a compile-time type-safe REST API routing table schema in TypeScript that validates request parameters and response bodies.",
    ],
  },
  React: {
    Easy: [
      "What are React props and state, and why is state considered immutable?",
      "Explain the Virtual DOM and how React's reconciliation algorithm detects changes.",
    ],
    Medium: [
      "Explain the rules and internal mechanics of the useEffect hook. How do dependency arrays and cleanup functions prevent bugs?",
      "Compare React Context API with state management libraries (Redux, Zustand) in terms of re-rendering behavior and scale.",
    ],
    Hard: [
      "How would you optimize a large React application suffering from frequent unwanted re-renders using React.memo, useMemo, useCallback, and React Profiler?",
      "Explain React 18 Concurrent Mode, Suspense for Data Fetching, and how transitions (useTransition, useDeferredValue) prioritize user interactions.",
    ],
  },
  "Node.js": {
    Easy: [
      "What is Node.js, and why is its single-threaded non-blocking I/O model advantageous for web servers?",
      "Explain the role of npm and package.json in managing dependencies and semantic versioning.",
    ],
    Medium: [
      "Explain how Node.js streams and buffers work, and why streaming is essential when processing large files or HTTP payloads.",
      "How does Node.js handle asynchronous operations using libuv thread pool versus kernel asynchronous mechanisms (epoll/kqueue)?",
    ],
    Hard: [
      "How would you architect a distributed clustering and worker thread strategy for a CPU-intensive computation server in Node.js?",
      "Explain backpressure in Node.js Streams and how you would design a pipeline that ingests gigabytes of real-time event logs without exhausting RAM.",
    ],
  },
  "Express.js": {
    Easy: [
      "What is middleware in Express.js, and what is the significance of calling the 'next()' function?",
      "How do you define route parameters and query parameters in an Express.js application?",
    ],
    Medium: [
      "How do you design a centralized error-handling middleware in Express.js that intercepts async errors and prevents leaking stack traces?",
      "Explain how you would implement token-based authentication (JWT) and role-based authorization middleware in an Express REST API.",
    ],
    Hard: [
      "How do you implement rate-limiting, request throttling, and DDoS protection middleware using Redis and token bucket algorithms in Express?",
      "Design a production-ready Express architecture supporting request correlation IDs, structured Pino logging, graceful shutdown, and health checks.",
    ],
  },
  "REST APIs": {
    Easy: [
      "What are the standard HTTP methods (GET, POST, PUT, PATCH, DELETE) and which of them are idempotent?",
      "What are HTTP status code ranges (2xx, 3xx, 4xx, 5xx) and when should you return 400 versus 404 versus 500?",
    ],
    Medium: [
      "Explain the difference between PUT and PATCH, and how you design RESTful URL naming hierarchies for nested resources.",
      "How do you implement pagination, filtering, and sorting in REST APIs (cursor-based versus offset-based pagination)?",
    ],
    Hard: [
      "How do you implement API versioning, idempotent write requests using Idempotency-Keys, and webhook retries with exponential backoff?",
      "Design a resilient microservices API gateway pattern handling circuit breakers, fallback routing, and distributed rate limiting.",
    ],
  },
  PostgreSQL: {
    Easy: [
      "What is the difference between primary keys, foreign keys, and unique constraints in a relational database?",
      "Explain the purpose of SQL SELECT, WHERE, GROUP BY, and ORDER BY clauses.",
    ],
    Medium: [
      "Explain the differences between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN with practical examples.",
      "What are database indexes (B-Tree vs Hash), how do they improve query performance, and what is the trade-off during writes?",
    ],
    Hard: [
      "Explain ACID properties in PostgreSQL and the differences between transaction isolation levels (Read Committed, Repeatable Read, Serializable).",
      "How would you diagnose and optimize a slow query in PostgreSQL using EXPLAIN ANALYZE, indexing strategies, and table partitioning?",
    ],
  },
  MongoDB: {
    Easy: [
      "What is MongoDB, and how does a document-based NoSQL database differ from a relational SQL database?",
      "Explain how collections and documents in MongoDB correspond to tables and rows in relational databases.",
    ],
    Medium: [
      "When should you embed subdocuments versus using document references in MongoDB data modeling?",
      "Explain the MongoDB Aggregation Pipeline and how stages like $match, $group, $project, and $lookup work.",
    ],
    Hard: [
      "How do replica sets, oplog replication, and write concerns (e.g. w: 'majority', j: true) guarantee data durability and high availability in MongoDB?",
      "How does sharding work in MongoDB, and what factors do you evaluate when choosing a shard key for a high-write dataset?",
    ],
  },
  Docker: {
    Easy: [
      "What is a Docker container, and how does it differ from a traditional virtual machine?",
      "Explain the purpose of a Dockerfile, Docker image, and Docker container.",
    ],
    Medium: [
      "Explain multi-stage Docker builds and how they reduce container image size and improve security.",
      "How do Docker networks and persistent volumes work, and how does Docker Compose coordinate multi-container applications?",
    ],
    Hard: [
      "How would you harden a container for production, including non-root users, read-only root filesystems, resource limits, and vulnerability scanning?",
      "Explain Docker layer caching mechanisms and how you structure a Dockerfile to maximize cache hit rates in CI/CD pipelines.",
    ],
  },
  "System Design": {
    Easy: [
      "What is vertical scaling versus horizontal scaling, and what are their respective trade-offs?",
      "What is a load balancer, and what algorithms does it use to distribute traffic (e.g., Round Robin, Least Connections)?",
    ],
    Medium: [
      "Explain caching strategies (Cache-Aside, Write-Through, Write-Back) and how Redis is used to reduce database read load.",
      "What is database replication, and what are the trade-offs between synchronous and asynchronous master-replica setups?",
    ],
    Hard: [
      "Design a URL shortener or rate limiter system capable of handling 50,000 requests per second with sub-10ms latency and high availability.",
      "Explain the CAP Theorem and PACELC theorem. How would you design a distributed session store that balances consistency and availability under network partitions?",
    ],
  },
};

/**
 * Fallback questions for any skills not explicitly in the dictionary.
 */
export function getFallbackQuestionForSkill(
  skill: string,
  difficulty: InterviewDifficulty,
  targetRole: string
): string {
  const bank = CURATED_QUESTION_BANK[skill];
  if (bank && bank[difficulty] && bank[difficulty].length > 0) {
    const list = bank[difficulty];
    return list[Math.floor(Math.random() * list.length)];
  }

  if (difficulty === "Easy") {
    return `Explain the core concepts and fundamental architecture of ${skill}, and why it is commonly utilized in ${targetRole} positions.`;
  } else if (difficulty === "Medium") {
    return `Describe how you implement and structure ${skill} in a production environment. What best practices and error handling strategies do you employ?`;
  } else {
    return `How would you troubleshoot performance bottlenecks, concurrency issues, or architectural scaling limitations when using ${skill} in an enterprise system?`;
  }
}

/**
 * Evaluates candidate's answer against the 5-dimension rubric with explanatory feedback and STAR ideal answer.
 */
export async function evaluateAnswerWithRubric(params: {
  questionText: string;
  userAnswer: string;
  skill: string;
  difficulty: InterviewDifficulty;
  targetRole: string;
  targetCompany: string;
}): Promise<AdaptiveAnswerEvaluation> {
  const trimmedAnswer = params.userAnswer.trim();

  // Handle empty or whitespace answer deterministically
  if (!trimmedAnswer || trimmedAnswer.length < 5) {
    const emptyRubric = calculateRubricComposite({
      technicalCorrectness: 0,
      accuracy: 0,
      depth: 0,
      practicalApplication: 0,
      communication: 0,
    });
    return {
      questionId: "",
      questionText: params.questionText,
      skill: params.skill,
      userAnswer: params.userAnswer,
      rubric: emptyRubric,
      strengths: [],
      gaps: ["No answer provided or response was too brief to evaluate."],
      suggestedImprovement: "Provide a detailed explanation defining core concepts, implementation steps, and practical engineering trade-offs.",
      betterAnswer: `A comprehensive answer on ${params.skill} should define the mechanism clearly, explain real-world usage patterns, and discuss trade-offs and edge cases.`,
      difficultyRating: params.difficulty,
      recommendedAction: "easier_question",
    };
  }

  // Attempt AI Evaluation with Gemini
  if (ai) {
    try {
      const prompt = `You are a Principal Engineering Interview Evaluator at ${params.targetCompany || "Google"}.
Evaluate the candidate's answer to this interview question using a rigorous 5-dimension rubric.

INTERVIEW CONTEXT:
- Target Role: "${params.targetRole}"
- Target Company: "${params.targetCompany}"
- Skill Assessed: "${params.skill}"
- Question Difficulty: "${params.difficulty}"
- Question: "${params.questionText}"

CANDIDATE ANSWER:
"${trimmedAnswer}"

RUBRIC DIMENSIONS (Rate each 0-100 based on realistic technical accuracy):
1. Technical Correctness (0-100, weight 0.30): Accuracy of terminology, syntax, logic, and architectural concepts.
2. Accuracy / Relevance (0-100, weight 0.20): How directly the response answers the specific prompt.
3. Depth of Explanation (0-100, weight 0.20): Demonstrates understanding of internal mechanisms, trade-offs, and failure modes.
4. Practical Application (0-100, weight 0.15): Uses practical examples, code structure, or real-world implementation reasoning.
5. Communication & Clarity (0-100, weight 0.15): Structured, coherent, professional engineering communication.

Return ONLY a single valid JSON object without Markdown backticks:
{
  "technicalCorrectness": 85,
  "accuracy": 80,
  "depth": 75,
  "practicalApplication": 80,
  "communication": 85,
  "strengths": ["Clear explanation of asynchronous event handling", "Correctly cited non-blocking I/O"],
  "gaps": ["Did not mention backpressure or memory consumption under heavy load"],
  "suggestedImprovement": "Explain how streams mitigate high memory spikes during large payload handling.",
  "betterAnswer": "An ideal answer structured with architectural best practices...",
  "recommendedAction": "harder_question"
}`;

      const aiText = await callGeminiWithFallback(prompt);
      if (aiText) {
        const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const rubric = calculateRubricComposite({
          technicalCorrectness: Number(parsed.technicalCorrectness) || 75,
          accuracy: Number(parsed.accuracy) || 75,
          depth: Number(parsed.depth) || 70,
          practicalApplication: Number(parsed.practicalApplication) || 70,
          communication: Number(parsed.communication) || 75,
        });

        let recommendedAction: AdaptiveNextAction = "next_skill";
        if (rubric.overallScore >= 80) recommendedAction = "harder_question";
        else if (rubric.overallScore >= 60) recommendedAction = "follow_up";
        else recommendedAction = "easier_question";

        return {
          questionId: "",
          questionText: params.questionText,
          skill: params.skill,
          userAnswer: params.userAnswer,
          rubric,
          strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
            ? parsed.strengths
            : ["Structured reasoning and coherent communication"],
          gaps: Array.isArray(parsed.gaps) && parsed.gaps.length > 0
            ? parsed.gaps
            : ["Could elaborate further on edge cases and scalability trade-offs"],
          suggestedImprovement: parsed.suggestedImprovement || "Discuss production trade-offs and error scenarios.",
          betterAnswer: parsed.betterAnswer || `Structure responses using STAR or architectural components: define core concepts, provide concrete implementation examples, and analyze trade-offs.`,
          difficultyRating: params.difficulty,
          recommendedAction,
        };
      }
    } catch (err) {
      console.error("AI Evaluation failed, using deterministic rubric fallback:", err);
    }
  }

  // Deterministic Rubric Evaluation Fallback
  const wordCount = trimmedAnswer.split(/\s+/).length;
  const lowerAnswer = trimmedAnswer.toLowerCase();

  // Evaluate technical vocabulary presence
  const techTerms = [
    "architecture", "performance", "scalable", "scalability", "async", "await", "promise",
    "database", "index", "latency", "throughput", "security", "cache", "redis", "query",
    "trade-off", "component", "state", "middleware", "api", "rest", "cluster", "memory",
    "error", "exception", "test", "docker", "service", "concurrency", "thread", "pipeline"
  ];
  const matchedTerms = techTerms.filter((term) => lowerAnswer.includes(term));
  const termDensityScore = Math.min(95, Math.max(50, 50 + matchedTerms.length * 5));

  // Depth based on length and technical elaboration
  const depthScore = Math.min(95, Math.max(45, 40 + Math.floor(wordCount / 4)));
  const communicationScore = wordCount >= 30 ? 82 : wordCount >= 15 ? 70 : 55;
  const accuracyScore = lowerAnswer.includes(params.skill.toLowerCase()) ? 85 : 70;
  const practicalScore = lowerAnswer.includes("example") || lowerAnswer.includes("use") || lowerAnswer.includes("code") ? 80 : 65;

  const rubric = calculateRubricComposite({
    technicalCorrectness: termDensityScore,
    accuracy: accuracyScore,
    depth: depthScore,
    practicalApplication: practicalScore,
    communication: communicationScore,
  });

  let action: AdaptiveNextAction = "next_skill";
  if (rubric.overallScore >= 80) action = "harder_question";
  else if (rubric.overallScore >= 60) action = "follow_up";
  else action = "easier_question";

  return {
    questionId: "",
    questionText: params.questionText,
    skill: params.skill,
    userAnswer: params.userAnswer,
    rubric,
    strengths: [
      `Addressed core themes of ${params.skill}`,
      `Incorporated key technical terms (${matchedTerms.slice(0, 3).join(", ") || "domain concepts"})`,
    ],
    gaps: [
      `Could provide deeper analysis of edge cases and high-throughput failure modes`,
      `Elaborate on production metrics and monitoring in real-world deployments`,
    ],
    suggestedImprovement: `Structure your answer with explicit components: 1) Core definition, 2) Implementation pattern with ${params.skill}, and 3) Performance and scale trade-offs.`,
    betterAnswer: `In a production ${params.targetRole} environment, ${params.skill} should be approached by clearly isolating concerns, implementing resilient error boundaries, and optimizing for both latency and memory efficiency under load.`,
    difficultyRating: params.difficulty,
    recommendedAction: action,
  };
}

/**
 * Generates an adaptive question using Gemini AI or the deterministic question bank.
 */
export async function generateAdaptiveQuestion(params: {
  targetRole: string;
  targetCompany: string;
  targetSkill: string;
  difficulty: InterviewDifficulty;
  isFollowup: boolean;
  parentQuestionText?: string;
  parentAnswerText?: string;
  identifiedGaps?: string[];
  followupReason?: string;
  questionIndex: number;
}): Promise<AdaptiveQuestion> {
  const qId = `q${params.questionIndex + 1}_${Date.now().toString(36)}`;

  // Follow-up Generation
  if (params.isFollowup && params.parentQuestionText && params.parentAnswerText) {
    if (ai) {
      try {
        const prompt = `You are a Principal Engineering Interviewer at ${params.targetCompany || "Google"}.
Generate a targeted, rigorous FOLLOW-UP technical interview question for a candidate targeting "${params.targetRole}".

CONTEXT:
- Target Skill: "${params.targetSkill}"
- Difficulty: "${params.difficulty}"
- Original Question: "${params.parentQuestionText}"
- Candidate's Actual Answer: "${params.parentAnswerText}"
- Identified Gaps / Misconceptions: ${JSON.stringify(params.identifiedGaps || [])}
- Follow-up Reason: "${params.followupReason || "Probe edge cases and deeper architectural reasoning"}"

INSTRUCTIONS:
Do NOT simply rephrase the original question. Investigate the specific gaps or push for concrete trade-offs, scaling limits, or failure handling.

Return ONLY a single valid JSON object without Markdown backticks:
{
  "text": "Your follow-up question here...",
  "category": "Technical Interview",
  "difficulty": "${params.difficulty}",
  "followupReason": "${params.followupReason || "Investigate edge cases and architectural trade-offs"}"
}`;

        const aiText = await callGeminiWithFallback(prompt);
        if (aiText) {
          const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.text) {
            return {
              questionId: qId,
              text: parsed.text,
              category: parsed.category || "Technical Interview",
              skill: params.targetSkill,
              difficulty: params.difficulty,
              isFollowup: true,
              followupReason: parsed.followupReason || params.followupReason,
            };
          }
        }
      } catch (err) {
        console.error("AI Follow-up Question generation error:", err);
      }
    }

    // Deterministic Follow-up Fallback
    const gapSnippet = (params.identifiedGaps && params.identifiedGaps[0]) || "edge cases and failure recovery";
    return {
      questionId: qId,
      text: `In your previous response on ${params.targetSkill}, you touched on the standard implementation. Specifically addressing ${gapSnippet}, how would you ensure system reliability, prevent cascading failures, and measure performance metrics under 10x traffic?`,
      category: "Technical Interview",
      skill: params.targetSkill,
      difficulty: params.difficulty,
      isFollowup: true,
      followupReason: params.followupReason || "Probing scalability trade-offs and edge case handling",
    };
  }

  // New Question Generation (AI)
  if (ai) {
    try {
      const prompt = `You are a Senior Engineering Hiring Manager at ${params.targetCompany || "Google"}.
Generate a realistic, specific, non-generic technical interview question assessing "${params.targetSkill}" for a "${params.targetRole}" position.

SPECIFICATIONS:
- Target Skill: "${params.targetSkill}"
- Difficulty Level: "${params.difficulty}" (Easy = fundamentals/syntax, Medium = practical real-world usage, Hard = high-scale/internal mechanics/trade-offs)
- Company Style: "${params.targetCompany}"

Return ONLY a single valid JSON object without Markdown backticks:
{
  "text": "Question text here...",
  "category": "Technical Interview",
  "difficulty": "${params.difficulty}"
}`;

      const aiText = await callGeminiWithFallback(prompt);
      if (aiText) {
        const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.text) {
          return {
            questionId: qId,
            text: parsed.text,
            category: parsed.category || "Technical Interview",
            skill: params.targetSkill,
            difficulty: params.difficulty,
            isFollowup: false,
          };
        }
      }
    } catch (err) {
      console.error("AI Question generation error:", err);
    }
  }

  // Deterministic New Question Fallback
  const fallbackText = getFallbackQuestionForSkill(params.targetSkill, params.difficulty, params.targetRole);
  return {
    questionId: qId,
    text: fallbackText,
    category: "Technical Interview",
    skill: params.targetSkill,
    difficulty: params.difficulty,
    isFollowup: false,
  };
}

/**
 * Synthesizes a comprehensive evidence-based final interview performance report.
 * Accurately distinguishes assessed skills from unassessed skills.
 */
export function synthesizeAdaptiveInterviewReport(params: {
  targetRole: string;
  targetCompany: string;
  allTargetSkills: string[];
  responses: IInterviewResponse[];
  historicalSessions?: Array<{ overallScore: number; createdAt: Date }>;
}): {
  overallScore: number;
  dimensionScores: {
    technicalCorrectness: number;
    accuracy: number;
    depth: number;
    communication: number;
    practicalApplication: number;
  };
  assessedSkills: IAssessedSkillSummary[];
  unassessedSkills: string[];
  strengths: string[];
  weaknesses: string[];
  conceptsToRevise: string[];
  suggestedResources: string[];
  suggestedProjects: string[];
  recommendedRoadmapSteps: string[];
  recommendedNextInterview: string;
  historicalComparison?: {
    previousAverageScore: number;
    scoreDelta: number;
    sessionsAnalyzed: number;
    note: string;
  };
} {
  const responses = params.responses || [];

  if (responses.length === 0) {
    return {
      overallScore: 0,
      dimensionScores: {
        technicalCorrectness: 0,
        accuracy: 0,
        depth: 0,
        communication: 0,
        practicalApplication: 0,
      },
      assessedSkills: [],
      unassessedSkills: params.allTargetSkills || [],
      strengths: ["No interview answers submitted yet."],
      weaknesses: ["Interview session finished without responses."],
      conceptsToRevise: [],
      suggestedResources: ["Review fundamentals before starting a new session."],
      suggestedProjects: [],
      recommendedRoadmapSteps: ["Phase 1: Core Fundamentals"],
      recommendedNextInterview: "Foundational Technical Practice",
    };
  }

  // Calculate composite dimension averages
  const sumTech = responses.reduce((acc, r) => acc + (r.technicalCorrectness || 75), 0);
  const sumAcc = responses.reduce((acc, r) => acc + (r.accuracy || 75), 0);
  const sumDepth = responses.reduce((acc, r) => acc + (r.depth || 70), 0);
  const sumComm = responses.reduce((acc, r) => acc + (r.communication || 75), 0);
  const sumPract = responses.reduce((acc, r) => acc + (r.practicalApplication || 70), 0);
  const sumTotal = responses.reduce((acc, r) => acc + (r.score || 75), 0);

  const count = responses.length;
  const dimensionScores = {
    technicalCorrectness: Math.round(sumTech / count),
    accuracy: Math.round(sumAcc / count),
    depth: Math.round(sumDepth / count),
    communication: Math.round(sumComm / count),
    practicalApplication: Math.round(sumPract / count),
  };

  const overallScore = Math.round(sumTotal / count);

  // Group performance by assessed skill
  const skillScoresMap = new Map<string, { totalScore: number; count: number }>();
  responses.forEach((r) => {
    const sName = r.skill ? normalizeSkillName(r.skill) : "General Engineering";
    const existing = skillScoresMap.get(sName) || { totalScore: 0, count: 0 };
    skillScoresMap.set(sName, {
      totalScore: existing.totalScore + r.score,
      count: existing.count + 1,
    });
  });

  const assessedSkills: IAssessedSkillSummary[] = Array.from(skillScoresMap.entries()).map(([skill, data]) => {
    const avg = Math.round(data.totalScore / data.count);
    const status: "strong" | "competent" | "weak" =
      avg >= 80 ? "strong" : avg >= 60 ? "competent" : "weak";
    return {
      skill,
      score: avg,
      questionsCount: data.count,
      status,
    };
  });

  // Calculate unassessed skills
  const assessedNames = new Set(assessedSkills.map((s) => s.skill.toLowerCase()));
  const unassessedSkills = (params.allTargetSkills || [])
    .map((s) => normalizeSkillName(s))
    .filter((s) => !assessedNames.has(s.toLowerCase()));

  // Extract unique strengths and weaknesses
  const allStrengths = Array.from(
    new Set(responses.flatMap((r) => r.strengths || []).filter(Boolean))
  );
  const allWeaknesses = Array.from(
    new Set(responses.flatMap((r) => r.gaps || []).filter(Boolean))
  );

  const conceptsToRevise = assessedSkills
    .filter((s) => s.score < 70)
    .map((s) => `${s.skill} (Score: ${s.score}%)`);

  if (conceptsToRevise.length === 0 && assessedSkills.length > 0) {
    conceptsToRevise.push("High-throughput distributed scale and edge case telemetry");
  }

  // Recommended Roadmap Steps mapping
  const weakSkillNames = assessedSkills.filter((s) => s.score < 70).map((s) => s.skill);
  const recommendedRoadmapSteps = weakSkillNames.length > 0
    ? weakSkillNames.map((s) => `Deep dive: Master ${s} practical exercises and deployment deliverables`)
    : ["Phase 4: Advanced Specializations & Cloud Architecture"];

  // Suggested resources & projects
  const suggestedResources = weakSkillNames.length > 0
    ? weakSkillNames.slice(0, 3).map((s) => `Official ${s} Documentation, Production Architecture Guides & RFCs`)
    : ["ByteByteGo System Design", "MDN Web Docs & AWS Architecture Center"];

  const suggestedProjects = weakSkillNames.length > 0
    ? [`Build an end-to-end service reinforcing ${weakSkillNames.join(" and ")} with production caching and testing`]
    : [`Build a production-grade full-stack platform tailored for ${params.targetRole} benchmarks`];

  // Historical Comparison
  let historicalComparison: {
    previousAverageScore: number;
    scoreDelta: number;
    sessionsAnalyzed: number;
    note: string;
  } | undefined = undefined;

  if (params.historicalSessions && params.historicalSessions.length > 0) {
    const validScores = params.historicalSessions.map((s) => s.overallScore).filter((score) => score > 0);
    if (validScores.length > 0) {
      const prevAvg = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
      const delta = overallScore - prevAvg;
      historicalComparison = {
        previousAverageScore: prevAvg,
        scoreDelta: delta,
        sessionsAnalyzed: validScores.length,
        note:
          delta > 0
            ? `Your overall score increased by +${delta}% compared to your previous ${validScores.length} session average (${prevAvg}%).`
            : delta < 0
            ? `Your overall score was ${Math.abs(delta)}% below your historical average (${prevAvg}%). Focus on revision areas.`
            : `Consistent performance on par with your historical average of ${prevAvg}%.`,
      };
    }
  }

  return {
    overallScore,
    dimensionScores,
    assessedSkills,
    unassessedSkills,
    strengths: allStrengths.slice(0, 4),
    weaknesses: allWeaknesses.slice(0, 4),
    conceptsToRevise,
    suggestedResources,
    suggestedProjects,
    recommendedRoadmapSteps,
    recommendedNextInterview:
      overallScore >= 80
        ? "Advanced System Design & High-Scale Technical Interview"
        : "Focused Targeted Technical Practice on Identified Gaps",
    historicalComparison,
  };
}
