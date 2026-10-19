import {
  buildPersonalizedSkillRoadmap,
  type SkillDependencyGraph,
  type SkillGraphNode,
} from "./skillGraph.service";
import type { RequirementPriority } from "./jobDescription.service";
import { generateResumeAnalysis } from "./ai.service";

export interface RoadmapStep {
  stepNumber: number;
  phase: number;
  phaseTitle: string;
  skillName: string;
  category: string;
  priority: RequirementPriority | "prerequisite";
  isDirectRequirement: boolean;
  reason: string;
  prerequisites: string[];
  unlockedSkills: string[];
  learningObjective: string;
  suggestedActivities: string[];
  practicalExercise: string;
  projectDeliverable: string;
  completionCriteria: string;
  status: "not_started" | "in_progress" | "completed";
  completedAt?: Date;
}

export interface PersonalizedRoadmap {
  targetRole: string;
  jobDescriptionSummary: string;
  totalSteps: number;
  completedSteps: number;
  completionPercentage: number;
  targetMissingSkillsCount: number;
  unmetPrerequisitesCount: number;
  demonstratedPrerequisitesCount: number;
  phases: Array<{
    phaseNumber: number;
    title: string;
    description: string;
    stepCount: number;
  }>;
  steps: RoadmapStep[];
  graph: SkillDependencyGraph;
  rationale: string;
}

/**
 * Curated deterministic educational templates for CareerAI taxonomy skills.
 * Guarantees high-quality, practical learning content even when LLM is offline.
 */
const CURATED_LEARNING_CONTENT: Record<
  string,
  {
    objective: string;
    activities: string[];
    exercise: string;
    deliverable: string;
    criteria: string;
  }
> = {
  JavaScript: {
    objective: "Master ES6+ syntax, asynchronous programming (Promises, async/await), and DOM event lifecycles.",
    activities: [
      "Study MDN JavaScript Guide on closures, event loop, and prototypes.",
      "Practice array transformations (map, filter, reduce) and asynchronous fetch APIs.",
    ],
    exercise: "Implement an asynchronous data-fetching utility with retry logic and error boundaries.",
    deliverable: "An interactive, browser-based dashboard visualizing live API data without external libraries.",
    criteria: "Can explain the event loop microtask queue and write bug-free asynchronous code.",
  },
  TypeScript: {
    objective: "Implement static type safety, generics, union types, and interface contracts across applications.",
    activities: [
      "Review TypeScript Handbook sections on Generics, Type Narrowing, and Utility Types.",
      "Convert a dynamically typed JavaScript script into strict TypeScript.",
    ],
    exercise: "Build an API response parsing utility using strict generic types and Zod schema validation.",
    deliverable: "A fully typed data client module with zero 'any' types and compile-time verification.",
    criteria: "Code compiles with noImplicitAny and strictNullChecks enabled.",
  },
  React: {
    objective: "Build responsive, declarative user interfaces using functional components, hooks, and unidirectional data flow.",
    activities: [
      "Study official React documentation on useState, useEffect, useMemo, and custom hooks.",
      "Build component hierarchies and implement state lifting.",
    ],
    exercise: "Create a paginated search-and-filter interface with debounced user inputs.",
    deliverable: "A modular, responsive web application component with client-side routing and clean state handling.",
    criteria: "Component renders efficiently without unnecessary re-renders or missing dependency warnings in hooks.",
  },
  "Node.js": {
    objective: "Understand backend server runtimes, asynchronous I/O, Node core modules (fs, path, events), and npm package architectures.",
    activities: [
      "Explore the Node.js event loop phases, process management, and streams.",
      "Write CLI scripts interacting with the local filesystem and environment variables.",
    ],
    exercise: "Build a multi-file log processor that streams large files and parses JSON logs asynchronously.",
    deliverable: "A standalone Node.js background worker utility with graceful termination signal handling.",
    criteria: "Understands non-blocking I/O and manages stream backpressure appropriately.",
  },
  Express: {
    objective: "Develop robust RESTful web servers, custom middleware pipelines, and structured error handlers.",
    activities: [
      "Read Express guide on routing, middleware chains, and route parameters.",
      "Implement CORS, request validation, and centralized error middleware.",
    ],
    exercise: "Create a complete CRUD API for an entity with input validation and HTTP status codes.",
    deliverable: "A production-structured Express application with modular routers, controllers, and error middlewares.",
    criteria: "All endpoints return proper status codes (200, 201, 400, 404, 500) and structured JSON responses.",
  },
  "REST API": {
    objective: "Design stateless, scalable HTTP APIs adhering to REST conventions, resource URI naming, and idempotent verbs.",
    activities: [
      "Study RESTful API design guidelines, idempotent methods (GET, PUT, DELETE), and payload formats.",
      "Design an OpenAPI/Swagger specification for a complex resource model.",
    ],
    exercise: "Document and implement a resource API supporting filtering, pagination, and sorting query parameters.",
    deliverable: "An OpenAPI 3.0 specification along with a working reference implementation.",
    criteria: "Complies with HTTP method semantics and provides consistent pagination metadata.",
  },
  SQL: {
    objective: "Write efficient relational queries, joins, aggregations, subqueries, and table schema definitions.",
    activities: [
      "Practice SQL queries on LeetCode/HackerRank covering INNER/LEFT JOINs and GROUP BY clauses.",
      "Analyze query execution plans (EXPLAIN) to understand index usage.",
    ],
    exercise: "Design a relational schema with foreign key constraints, indexes, and write a 3-table reporting query.",
    deliverable: "A normalized database migration script and complex aggregation report queries.",
    criteria: "Queries execute correctly without Cartesian products and leverage indexes for filtering.",
  },
  MongoDB: {
    objective: "Model document schemas, query nested BSON documents, and create aggregation pipelines.",
    activities: [
      "Study MongoDB schema design patterns (embedding vs referencing) and index strategies.",
      "Write aggregation pipelines using $match, $group, $lookup, and $project.",
    ],
    exercise: "Implement Mongoose schemas with validation, virtuals, and compound indexes.",
    deliverable: "A persistence layer with Mongoose models and an aggregation pipeline for analytics.",
    criteria: "Understands when to embed vs reference documents to optimize read performance.",
  },
  PostgreSQL: {
    objective: "Leverage advanced relational features, ACID transactions, JSONB columns, and connection pooling.",
    activities: [
      "Study PostgreSQL transaction isolation levels and concurrency control.",
      "Implement database migrations and connection pool management.",
    ],
    exercise: "Write a transactional workflow ensuring atomicity across multiple table updates.",
    deliverable: "A schema migration and repository layer utilizing connection pooling and transaction rollbacks.",
    criteria: "Transactions roll back cleanly on errors without leaving orphan records.",
  },
  Docker: {
    objective: "Containerize applications using multi-stage Dockerfiles and compose multi-service environments.",
    activities: [
      "Learn Docker image layering, caching strategies, and .dockerignore files.",
      "Compose application, database, and cache containers via docker-compose.",
    ],
    exercise: "Write an optimized multi-stage Dockerfile that reduces production image size.",
    deliverable: "A docker-compose.yml orchestrating an application server and database with persistent volumes.",
    criteria: "Application builds and boots cleanly with a single 'docker compose up' command.",
  },
  Git: {
    objective: "Master version control workflows, branching strategies, rebasing, merge conflict resolution, and history hygiene.",
    activities: [
      "Practice interactive git rebase, cherry-pick, and stash workflows.",
      "Configure branch protection rules and semantic pull requests.",
    ],
    exercise: "Simulate and resolve a complex multi-file merge conflict across divergent branches.",
    deliverable: "A repository demonstrating clean atomic commits following Conventional Commits format.",
    criteria: "Demonstrates clear understanding of working tree, staging index, and remote tracking branches.",
  },
  "Data Structures and Algorithms": {
    objective: "Analyze algorithmic time and space complexity (Big-O) and implement foundational data structures.",
    activities: [
      "Implement linked lists, trees, graphs, heaps, and hash maps from scratch.",
      "Solve medium-level graph and dynamic programming problems.",
    ],
    exercise: "Implement BFS, DFS, and topological sort algorithms with comprehensive unit tests.",
    deliverable: "A tested library of fundamental data structures with Big-O complexity documentation.",
    criteria: "Accurately analyzes time and space complexity of arbitrary algorithms.",
  },
};

/**
 * Returns default educational content for skills not explicitly present in the curated catalog.
 */
const getDefaultLearningContent = (skillName: string, category: string) => ({
  objective: `Acquire practical proficiency in ${skillName} within the context of ${category}.`,
  activities: [
    `Study the official ${skillName} documentation, core guides, and architecture overviews.`,
    `Review open-source examples and industry best practices for ${skillName}.`,
  ],
  exercise: `Build a focused proof-of-concept integrating ${skillName} into a modern project.`,
  deliverable: `A functional repository demonstrating ${skillName} implementation with clean code and tests.`,
  criteria: `Can explain the core concepts of ${skillName} and apply it to resolve typical engineering tasks.`,
});

/**
 * Generates an intelligent, phased learning roadmap from missing skills and candidate evidence.
 */
export const generateRoadmap = async ({
  missingSkills,
  demonstratedSkills = [],
  completedSkills = [],
  jobTitle = "Software Engineer",
  jobDescriptionText = "",
}: {
  missingSkills: Array<{ name: string; priority: RequirementPriority }>;
  demonstratedSkills?: string[];
  completedSkills?: string[];
  jobTitle?: string;
  jobDescriptionText?: string;
}): Promise<PersonalizedRoadmap> => {
  // 1. Run the deterministic graph expansion and topological sorting
  const { allSkillsToLearn, targetSkills, unmetPrerequisites, demonstratedPrerequisites, graph } =
    buildPersonalizedSkillRoadmap({
      missingSkills,
      demonstratedSkills,
      completedSkills,
    });

  // If no skills are needed (100% matched or empty JD)
  if (allSkillsToLearn.length === 0) {
    return {
      targetRole: jobTitle,
      jobDescriptionSummary:
        jobDescriptionText.slice(0, 200) + (jobDescriptionText.length > 200 ? "..." : ""),
      totalSteps: 0,
      completedSteps: 0,
      completionPercentage: 100,
      targetMissingSkillsCount: 0,
      unmetPrerequisitesCount: 0,
      demonstratedPrerequisitesCount: demonstratedPrerequisites.length,
      phases: [],
      steps: [],
      graph,
      rationale:
        "Congratulations! Your resume already covers all recognized requirements for this job description.",
    };
  }

  // 2. Organize steps into logical learning phases:
  // Phase 1: Foundational Prerequisites (unmet prerequisites required by downstream tools)
  // Phase 2: Core Direct Requirements (core required job requirements)
  // Phase 3: Specialization & Preferred Qualifications (preferred or advanced integration skills)
  const steps: RoadmapStep[] = [];
  const completedSet = new Set(completedSkills.map((s) => s.toLowerCase()));

  for (let i = 0; i < allSkillsToLearn.length; i++) {
    const skillName = allSkillsToLearn[i];
    const node = graph.nodes.find((n) => n.name === skillName);
    const category = node?.category || "Technical Skill";
    const isDirect = node?.isJobRequirement ?? false;
    const priority = node?.jobPriority || (isDirect ? "required" : "prerequisite");
    const prereqs = node?.prerequisites || [];
    const unlocked = node?.unlockedTargetSkills || [];

    // Determine phase assignment
    let phase = 1;
    let phaseTitle = "Phase 1: Foundations & Prerequisites";
    if (priority === "prerequisite") {
      phase = 1;
      phaseTitle = "Phase 1: Foundations & Prerequisites";
    } else if (priority === "required" || priority === "unspecified") {
      phase = prereqs.length > 0 ? 2 : 1;
      phaseTitle = phase === 1 ? "Phase 1: Core Fundamentals" : "Phase 2: Core Job Requirements";
    } else {
      phase = 3;
      phaseTitle = "Phase 3: Preferred Qualifications & Advanced Stack";
    }

    // Compose rationale
    let reason = "";
    if (isDirect) {
      reason = `Direct ${priority} qualification requested in the job description.`;
    } else {
      reason = `Essential foundational prerequisite required before learning ${unlocked.join(", ")}.`;
    }

    const template =
      CURATED_LEARNING_CONTENT[skillName] || getDefaultLearningContent(skillName, category);

    const isCompleted = completedSet.has(skillName.toLowerCase());

    steps.push({
      stepNumber: i + 1,
      phase,
      phaseTitle,
      skillName,
      category,
      priority,
      isDirectRequirement: isDirect,
      reason,
      prerequisites: prereqs,
      unlockedSkills: unlocked,
      learningObjective: template.objective,
      suggestedActivities: template.activities,
      practicalExercise: template.exercise,
      projectDeliverable: template.deliverable,
      completionCriteria: template.criteria,
      status: isCompleted ? "completed" : "not_started",
      completedAt: isCompleted ? new Date() : undefined,
    });
  }

  // Phase aggregation
  const phaseMap = new Map<number, { title: string; count: number }>();
  for (const step of steps) {
    const existing = phaseMap.get(step.phase);
    if (existing) {
      existing.count += 1;
    } else {
      phaseMap.set(step.phase, { title: step.phaseTitle, count: 1 });
    }
  }

  const phases = Array.from(phaseMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, data]) => ({
      phaseNumber: num,
      title: data.title,
      description:
        num === 1
          ? "Establish required conceptual foundations and language prerequisites."
          : num === 2
          ? "Master core technologies and frameworks directly required for this position."
          : "Elevate your profile with preferred qualifications and integration depth.",
      stepCount: data.count,
    }));

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const completionPercentage =
    steps.length === 0 ? 100 : Math.round((completedCount / steps.length) * 100);

  const rationale =
    `This personalized roadmap contains ${steps.length} ordered steps generated using topological sorting over CareerAI's skill dependency graph. ` +
    `It addresses ${targetSkills.length} missing job requirements while prioritizing ${unmetPrerequisites.length} prerequisite foundations first. ` +
    (demonstratedPrerequisites.length > 0
      ? `Skills you already demonstrated on your resume (${demonstratedPrerequisites.join(", ")}) were recognized and marked as satisfied.`
      : "");

  return {
    targetRole: jobTitle,
    jobDescriptionSummary:
      jobDescriptionText.slice(0, 200) + (jobDescriptionText.length > 200 ? "..." : ""),
    totalSteps: steps.length,
    completedSteps: completedCount,
    completionPercentage,
    targetMissingSkillsCount: targetSkills.length,
    unmetPrerequisitesCount: unmetPrerequisites.length,
    demonstratedPrerequisitesCount: demonstratedPrerequisites.length,
    phases,
    steps,
    graph,
    rationale,
  };
};
