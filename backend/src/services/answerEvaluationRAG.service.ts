/**
 * answerEvaluationRAG.service.ts
 *
 * Grounded Interview Answer Evaluation and Reference Answer Generator using
 * lightweight, testable Retrieval-Augmented Generation (RAG) and Lexical Ranking (BM25).
 *
 * Enforces strict question-to-reference-answer relationships, deterministic abstention
 * detection (0% for "I don't know", "no", empty), domain-specific concept scoring,
 * and provenance-backed evidence retrieval.
 */

import { EvaluationRubricScores } from "./adaptiveInterview.service";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ExpectedConcept {
  id: string;
  name: string;
  description: string;
  weight: number; // 0.1 to 1.0
  category: "core" | "detail" | "tradeoff" | "misconception";
}

export interface StructuredExpectedAnswer {
  questionId: string;
  targetSkill: string;
  technology: string;
  coreConcepts: string[];
  keyDetails: string[];
  implementationSteps: string[];
  tradeoffs: string[];
  misconceptions: string[];
  idealReferenceAnswer: string;
  curatedKeywords: string[];
  incompatibleDomains: string[];
}

export interface RetrievedEvidence {
  source: "curated_knowledge" | "project_manifest" | "verified_source" | "question_context";
  title: string;
  snippet: string;
  score: number;
  provenance?: string;
}

export interface RAGEvaluationResult {
  rubric: EvaluationRubricScores;
  coveredConcepts: string[];
  partiallyCoveredConcepts: string[];
  missingConcepts: string[];
  identifiedMisconceptions: string[];
  strengths: string[];
  gaps: string[];
  suggestedImprovement: string;
  betterAnswer: string;
  isAbstention: boolean;
  retrievedEvidence: RetrievedEvidence[];
}

// ─── 1. Curated Expected-Answer Knowledge Base ────────────────────────────────

export const CURATED_EXPECTED_ANSWERS: Record<string, StructuredExpectedAnswer> = {
  axios_error_handling: {
    questionId: "axios_error_handling",
    targetSkill: "Axios",
    technology: "Axios / HTTP Networking",
    coreConcepts: [
      "Axios response interceptors for centralized error handling (axios.interceptors.response.use)",
      "Detecting HTTP 401 Unauthorized status and token refresh",
      "Request queuing and retry mechanism for failed requests",
      "Preventing infinite refresh loops with isolated instance or retry flag",
      "Request cancellation using AbortController",
    ],
    keyDetails: [
      "Accessing error.response.status and error.response.data",
      "Rejecting promises with Promise.reject(error) to propagate unhandled errors",
      "Queueing failed requests while token refresh is in flight to prevent multiple refresh calls",
      "Using custom axios instances via axios.create() to isolate API base URLs and headers",
    ],
    implementationSteps: [
      "Create a dedicated API client instance with axios.create()",
      "Register request interceptor to inject Authorization Bearer header",
      "Register response interceptor with success and error handlers",
      "In the error handler, inspect error.response.status; if 401 and not already retried, call refresh endpoint",
      "Update stored token, replay the original request with new token, or redirect to login on failure",
    ],
    tradeoffs: [
      "Infinite token refresh loops if the refresh endpoint itself returns 401 without retry guard (_retry flag)",
      "Concurrency race conditions when multiple parallel requests trigger token refresh simultaneously",
      "Memory leaks if AbortController signals are not cleaned up when React components unmount",
    ],
    misconceptions: [
      "Placing token refresh logic in request interceptors rather than response interceptors",
      "Confusing Axios interceptors with mobile WebSocket or Android StateFlow mechanisms",
      "Assuming Axios automatically retries failed network requests without explicit configuration",
    ],
    idealReferenceAnswer:
      "In production web applications, Axios error handling should be centralized using response interceptors via `axios.interceptors.response.use`. When a request fails, the interceptor inspects `error.response?.status`. For HTTP 401 (Unauthorized), it uses a mutex/flag (e.g. `_retry`) to initiate a single refresh token request, queues concurrent requests, updates authentication headers, and replays the original failed request via `axiosInstance(originalRequest)`. For 403 or 500 errors, it transforms raw errors into user-friendly notifications and propagates a structured error via `Promise.reject(error)`. Finally, unmounting components should cancel in-flight requests using `AbortController` (`signal: controller.signal`) to eliminate memory leaks.",
    curatedKeywords: [
      "axios", "interceptor", "interceptors", "response", "request", "401", "token", "refresh",
      "retry", "abortcontroller", "status", "bearer", "instance", "error", "network", "promise"
    ],
    incompatibleDomains: [
      "kotlin", "websocket", "stateflow", "android", "viewmodel", "jetpack", "composable"
    ],
  },

  react_component_organization: {
    questionId: "react_component_organization",
    targetSkill: "React",
    technology: "React / State Architecture",
    coreConcepts: [
      "Unidirectional data flow and single source of truth",
      "Separation of concerns (container/smart components vs presentational/dumb components)",
      "Custom hooks for reusable stateful business logic",
      "Prop drilling mitigation via Context API or atomic state management (Zustand/Redux)",
      "Performance optimization with React.memo, useMemo, and useCallback",
    ],
    keyDetails: [
      "Colocating state as close as possible to where it is consumed",
      "Component lifecycle and cleanups in useEffect hook",
      "Immutable state updates to prevent stale closures and missed renders",
      "Virtual DOM reconciliation and stable key prop usage",
    ],
    implementationSteps: [
      "Organize component directory by feature or domain rather than technical type",
      "Extract pure UI primitives into a shared design system library",
      "Encapsulate API requests and side effects into custom React hooks (e.g. useUser, useJobMatch)",
      "Manage local UI state with useState/useReducer and global shared state with Context or Zustand",
    ],
    tradeoffs: [
      "Over-memoization with useMemo/useCallback introduces memory overhead and code complexity without measurable gain",
      "Context API triggers re-renders of all consuming child components when state value updates unless split",
    ],
    misconceptions: [
      "Using index as key for dynamically reordered lists",
      "Mutating state directly instead of using functional updates",
    ],
    idealReferenceAnswer:
      "I organize React applications using a feature-based modular architecture. Presentational components remain pure and stateless, receiving data and callbacks through props. Complex stateful logic and data fetching are encapsulated in custom React hooks, keeping component JSX clean and declarative. For state management, local ephemeral state resides in `useState`/`useReducer`, while global state is managed through scoped Context providers or lightweight stores (like Zustand). To prevent unnecessary re-renders, expensive computations are memoized with `useMemo`, and callbacks passed to memoized children use `useCallback` with stable dependency arrays.",
    curatedKeywords: [
      "react", "component", "state", "props", "hook", "hooks", "custom hook", "useeffect",
      "usememo", "usecallback", "context", "re-render", "unidirectional", "virtual dom", "zustand"
    ],
    incompatibleDomains: [
      "kotlin", "android", "c++", "embedded", "swift"
    ],
  },

  authentication_authorization: {
    questionId: "authentication_authorization",
    targetSkill: "Authentication",
    technology: "Authentication & Authorization (JWT / RBAC)",
    coreConcepts: [
      "Stateless authentication using JSON Web Tokens (JWT)",
      "Distinction between authentication (identity verification) and authorization (permissions / RBAC)",
      "Short-lived access tokens paired with secure refresh tokens",
      "Secure token storage: HttpOnly, Secure, SameSite cookies to mitigate XSS and CSRF",
      "Role-Based Access Control (RBAC) middleware verifying permissions per route",
    ],
    keyDetails: [
      "Signing JWTs using asymmetric (RS256) or strong symmetric (HS256) secrets",
      "Validating expiration (exp) and issuer (iss) claims on every request",
      "Refresh token rotation and family invalidation upon detected token reuse",
    ],
    implementationSteps: [
      "Authenticate candidate credentials (e.g. bcrypt password hash verification)",
      "Issue short-lived access token (e.g. 15m) and long-lived refresh token (e.g. 7d)",
      "Store refresh token in HttpOnly SameSite=Strict cookie or encrypted database table",
      "Express/API middleware verifies Authorization header token and attaches user identity to request",
      "Authorize endpoint access through role/permission checking middleware",
    ],
    tradeoffs: [
      "Pure stateless JWTs cannot be revoked immediately without maintaining a revocation blacklist in Redis",
      "HttpOnly cookies protect against XSS but require CSRF protection tokens for cross-site mutations",
    ],
    misconceptions: [
      "Storing sensitive JWTs in localStorage where they are vulnerable to cross-site scripting (XSS)",
      "Confusing authentication (who you are) with authorization (what you can do)",
    ],
    idealReferenceAnswer:
      "A production authentication system should enforce separation between authentication and authorization. Upon validating credentials with a secure hashing algorithm like bcrypt, the backend issues a short-lived JWT access token (15 minutes) and a persistent refresh token stored in an HttpOnly, Secure, SameSite=Strict cookie. Authentication middleware verifies token signatures, expiration claims, and attaches the user payload to `req.user`. Authorization is enforced through granular Role-Based Access Control (RBAC) middleware verifying user roles before allowing access. To handle token revocation, refresh token rotation is used with automatic session revocation if an expired token is reused.",
    curatedKeywords: [
      "jwt", "token", "authentication", "authorization", "rbac", "refresh token", "httponly",
      "cookie", "xss", "csrf", "bcrypt", "middleware", "role", "permissions", "signature"
    ],
    incompatibleDomains: [
      "websocket", "kotlin", "css", "styling"
    ],
  },

  database_models_api_design: {
    questionId: "database_models_api_design",
    targetSkill: "Database Design",
    technology: "Database Architecture & RESTful API Design",
    coreConcepts: [
      "Relational vs Document schema modeling based on access patterns",
      "Indexing strategies (B-Tree, compound indexes) to optimize query performance",
      "Idempotency in API operations (safe GET, idempotent PUT/DELETE, non-idempotent POST)",
      "Pagination patterns (cursor-based pagination for high-volume data vs offset/limit)",
      "Data consistency, referential integrity, and cascading delete management",
    ],
    keyDetails: [
      "Analyzing slow queries with EXPLAIN plans to eliminate full table scans",
      "Proper HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict",
      "Schema normalization to eliminate redundancy vs strategic denormalization for read performance",
    ],
    implementationSteps: [
      "Define entity models with strict validation constraints and foreign key/reference relationships",
      "Create compound indexes on frequently queried combinations (e.g. { user: 1, createdAt: -1 })",
      "Implement RESTful endpoints adhering to standard HTTP verbs and status codes",
      "Add input validation (e.g. Zod or Joi) before database persistence",
    ],
    tradeoffs: [
      "Over-indexing improves read performance but degrades write/insert throughput and increases disk storage",
      "Offset pagination suffers performance degradation on large datasets (O(N) row scanning)",
    ],
    misconceptions: [
      "Assuming MongoDB/NoSQL requires zero schema design or index management",
      "Using GET requests for state-mutating actions",
    ],
    idealReferenceAnswer:
      "Effective database and API design starts with modeling schemas around application access patterns. In MongoDB/PostgreSQL, I define strict schemas with type validation and establish compound indexes on high-frequency query filters (e.g. `user` + `createdAt`). For API design, endpoints follow RESTful conventions with predictable resource naming, proper HTTP verbs, and idempotency guarantees. To scale high-volume listings, I implement cursor-based pagination rather than offset/limit to prevent performance degradation on large datasets. Cascade cleanup is explicitly enforced at the service level to prevent orphaned child documents.",
    curatedKeywords: [
      "database", "schema", "model", "index", "indexes", "compound index", "rest", "api",
      "pagination", "cursor", "idempotent", "foreign key", "normalization", "nosql", "query"
    ],
    incompatibleDomains: [
      "kotlin", "android", "mobile lifecycle", "stateflow"
    ],
  },

  kotlin_websocket_stateflow: {
    questionId: "kotlin_websocket_stateflow",
    targetSkill: "Kotlin",
    technology: "Kotlin / Coroutines & Reactive Architecture",
    coreConcepts: [
      "Asynchronous stream processing using Kotlin Coroutines and Flows",
      "StateFlow (hot stream with replay=1, state holder) vs SharedFlow (event stream)",
      "WebSocket connection lifecycle (CONNECTING, OPEN, CLOSING, CLOSED) via OkHttp or Ktor",
      "Lifecycle-aware collection using repeatOnLifecycle or flowWithLifecycle in Android",
      "Backpressure handling, reconnect strategies, and heartbeat/ping-pong monitoring",
    ],
    keyDetails: [
      "Using WebSocketListener to receive onMessage, onFailure, and onClosed callbacks",
      "Emitting incoming socket events to MutableStateFlow or MutableSharedFlow",
      "Dispatching network events on Dispatchers.IO while UI state updates consume on Dispatchers.Main",
    ],
    implementationSteps: [
      "Configure OkHttp client with WebSocket ping interval for liveness detection",
      "Implement custom WebSocketListener forwarding text payloads into a CoroutineScope",
      "Expose immutable StateFlow<UiState> from ViewModel to UI layer",
      "Collect flow emissions safely in Android Activity/Fragment using viewLifecycleOwner.lifecycleScope.repeatOnLifecycle",
    ],
    tradeoffs: [
      "StateFlow conflates emissions when updates arrive faster than the collector can process",
      "Unmanaged WebSocket connections cause severe battery drain and background memory retention",
    ],
    misconceptions: [
      "Collecting flows directly in lifecycleScope.launch without repeatOnLifecycle leads to background leaks",
      "Confusing StateFlow with LiveData or RxJava Observables without structured concurrency",
    ],
    idealReferenceAnswer:
      "In Kotlin/Android architecture, real-time WebSocket communication is managed by pairing OkHttp's `WebSocketListener` with Kotlin Coroutines. Incoming messages from the socket are parsed on `Dispatchers.IO` and emitted into a `MutableStateFlow<UiState>` inside the ViewModel. Because `StateFlow` is a hot stream that holds the latest state, the UI layer collects it using `repeatOnLifecycle(Lifecycle.State.STARTED)` to prevent collecting when the app is backgrounded. For transient events like error alerts, a `SharedFlow` with replay=0 is used instead. Reconnection is handled using exponential backoff with ping/pong heartbeats to detect stale connections.",
    curatedKeywords: [
      "kotlin", "websocket", "stateflow", "sharedflow", "coroutine", "coroutines", "flow",
      "okhttp", "viewmodel", "lifecycle", "repeatonlifecycle", "dispatchers", "android"
    ],
    incompatibleDomains: [
      "axios", "react", "express", "mongo", "mongoose", "css"
    ],
  },
};

// ─── 2. Deterministic Abstention and Non-Answer Detection ──────────────────────

const ABSTENTION_PATTERNS = [
  /^(?:i\s+)?(?:don'?t|do\s+not)\s+know\b/i,
  /^not\s+sure\b/i,
  /^(?:i\s+have\s+)?no\s+idea\b/i,
  /^no\s+clue\b/i,
  /^i\s+am\s+not\s+sure\b/i,
  /^i\s+cannot\s+answer\b/i,
  /^i\s+can'?t\s+answer\b/i,
  /^can'?t\s+say\b/i,
  /^idk\b/i,
  /^dunno\b/i,
  /^pass\b/i,
  /^skip\b/i,
  /^no$/i,
  /^nope$/i,
  /^none$/i,
  /^na$/i,
  /^n\/a$/i,
  /^nil$/i,
  /^nothing$/i,
];

export function isClearAbstention(answer: string): boolean {
  const trimmed = answer.trim();
  if (!trimmed) return true;
  return ABSTENTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// ─── 3. BM25 / Lexical Retrieval and Ranking Engine ───────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Calculates a lexical relevance score between a query and a candidate document.
 */
function scoreDocumentRelevance(queryTokens: string[], docText: string, docKeywords: string[]): number {
  const docTokens = new Set(tokenize(docText));
  const keywordSet = new Set(docKeywords.map((k) => k.toLowerCase()));

  let score = 0;
  for (const token of queryTokens) {
    if (keywordSet.has(token)) score += 3.0; // High weight for domain keywords
    if (docTokens.has(token)) score += 1.0;
  }
  return score;
}

/**
 * Retrieves the most relevant structured expected answer and reference evidence.
 */
export function retrieveExpectedAnswer(params: {
  questionText: string;
  skill: string;
  projectContext?: {
    projectTitle: string;
    repositoryUrl: string;
    findingsSummary?: string;
    fileReference?: string;
  };
}): {
  expectedAnswer: StructuredExpectedAnswer;
  retrievedEvidence: RetrievedEvidence[];
} {
  const queryText = `${params.skill} ${params.questionText}`;
  const queryTokens = tokenize(queryText);

  // Score all curated expected answers
  const scoredAnswers = Object.values(CURATED_EXPECTED_ANSWERS).map((candidate) => {
    let score = scoreDocumentRelevance(
      queryTokens,
      `${candidate.targetSkill} ${candidate.technology} ${candidate.coreConcepts.join(" ")}`,
      candidate.curatedKeywords
    );

    // Hard penalty for incompatible domains (prevents Axios from matching Kotlin!)
    const queryLower = queryText.toLowerCase();
    for (const badDomain of candidate.incompatibleDomains) {
      if (queryLower.includes(badDomain)) {
        score -= 50; // Heavy negative weight
      }
    }

    // Direct skill match bonus (both directions)
    const paramSkill = params.skill.toLowerCase();
    const candidateSkill = candidate.targetSkill.toLowerCase();
    if (paramSkill.includes(candidateSkill) || candidateSkill.includes(paramSkill)) {
      score += 40;
    }

    return { candidate, score };
  });

  scoredAnswers.sort((a, b) => b.score - a.score);
  const bestMatch = scoredAnswers[0]?.score > 0 ? scoredAnswers[0].candidate : null;

  // If a curated match exists and passes positive relevance, use it
  if (bestMatch) {
    const evidence: RetrievedEvidence[] = [
      {
        source: "curated_knowledge",
        title: `${bestMatch.technology} Reference Architecture`,
        snippet: bestMatch.coreConcepts.slice(0, 3).join("; "),
        score: scoredAnswers[0].score,
        provenance: "CareerAI Technical Assessment Taxonomy",
      },
    ];

    if (params.projectContext && params.projectContext.fileReference) {
      evidence.push({
        source: "project_manifest",
        title: `Observed in ${params.projectContext.projectTitle}`,
        snippet: params.projectContext.findingsSummary || `Repository file: ${params.projectContext.fileReference}`,
        score: 10,
        provenance: params.projectContext.repositoryUrl,
      });
    }

    return { expectedAnswer: bestMatch, retrievedEvidence: evidence };
  }

  // Fallback: Dynamically generate a structured expected answer for unknown or generic skills
  const dynamicExpected: StructuredExpectedAnswer = {
    questionId: `dynamic_${Date.now()}`,
    targetSkill: params.skill,
    technology: `${params.skill} Technical Architecture`,
    coreConcepts: [
      `Core mechanisms and lifecycle of ${params.skill}`,
      `Production implementation patterns and error resilience with ${params.skill}`,
      `Scalability, memory efficiency, and real-world trade-offs in ${params.skill}`,
    ],
    keyDetails: [
      `Syntax accuracy and idiomatic API usage in ${params.skill}`,
      `Separation of concerns and modular boundaries`,
    ],
    implementationSteps: [
      `Define architectural components and initialize client/service`,
      `Implement error handling boundaries and edge-case guards`,
      `Measure performance impact under concurrent workloads`,
    ],
    tradeoffs: [
      `Latency vs memory overhead trade-offs`,
      `Failure isolation and graceful degradation under partial outages`,
    ],
    misconceptions: [
      `Assuming default settings are production-ready without performance tuning`,
    ],
    idealReferenceAnswer: `A comprehensive answer on ${params.skill} should define the core mechanism clearly, explain practical implementation patterns with proper error handling, and analyze trade-offs regarding scalability, latency, and resource limits under production loads.`,
    curatedKeywords: tokenize(params.skill),
    incompatibleDomains: [],
  };

  return {
    expectedAnswer: dynamicExpected,
    retrievedEvidence: [
      {
        source: "question_context",
        title: `${params.skill} Standard Engineering Criteria`,
        snippet: dynamicExpected.coreConcepts.join("; "),
        score: 5,
        provenance: "CareerAI Standard Diagnostic Engine",
      },
    ],
  };
}

// ─── 4. Rubric Score Computation and Concept Matching ────────────────────────

export function evaluateAnswerGrounded(params: {
  questionText: string;
  skill: string;
  userAnswer: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  targetRole?: string;
  targetCompany?: string;
  projectContext?: {
    projectTitle: string;
    repositoryUrl: string;
    findingsSummary?: string;
    fileReference?: string;
  };
}): RAGEvaluationResult {
  const trimmed = params.userAnswer.trim();
  const lowerAnswer = trimmed.toLowerCase();

  // 1. Retrieve question-grounded expected answer representation
  const { expectedAnswer, retrievedEvidence } = retrieveExpectedAnswer({
    questionText: params.questionText,
    skill: params.skill,
    projectContext: params.projectContext,
  });

  // 2. Check for empty answer
  if (!trimmed) {
    return {
      rubric: {
        technicalCorrectness: 0,
        accuracy: 0,
        depth: 0,
        practicalApplication: 0,
        communication: 0,
        overallScore: 0,
      },
      coveredConcepts: [],
      partiallyCoveredConcepts: [],
      missingConcepts: expectedAnswer.coreConcepts,
      identifiedMisconceptions: [],
      strengths: [],
      gaps: ["No answer provided / submitted. Complete response required to assess technical competence."],
      suggestedImprovement: `Review the fundamentals of ${expectedAnswer.targetSkill} and outline the core implementation steps.`,
      betterAnswer: expectedAnswer.idealReferenceAnswer,
      isAbstention: true,
      retrievedEvidence,
    };
  }

  // 3. Check for clear abstention (e.g. "I don't know", "no", "not sure")
  if (isClearAbstention(trimmed)) {
    return {
      rubric: {
        technicalCorrectness: 0,
        accuracy: 0,
        depth: 0,
        practicalApplication: 0,
        communication: 0,
        overallScore: 0,
      },
      coveredConcepts: [],
      partiallyCoveredConcepts: [],
      missingConcepts: expectedAnswer.coreConcepts,
      identifiedMisconceptions: [],
      strengths: [],
      gaps: ["Candidate stated they did not know the answer or declined to answer."],
      suggestedImprovement: `Study the core concepts of ${expectedAnswer.targetSkill}, specifically: ${expectedAnswer.coreConcepts.slice(0, 2).join(", ")}.`,
      betterAnswer: expectedAnswer.idealReferenceAnswer,
      isAbstention: true,
      retrievedEvidence,
    };
  }

  // 4. Check for domain contamination / completely irrelevant answer
  const answerTokens = tokenize(lowerAnswer);
  const matchedKeywords = expectedAnswer.curatedKeywords.filter((k) => lowerAnswer.includes(k.toLowerCase()));

  // Check if answer discusses incompatible domains (e.g. Kotlin code for Axios question)
  const hasIncompatibleTech = expectedAnswer.incompatibleDomains.some((bad) => lowerAnswer.includes(bad));

  // If answer has 0 matched keywords AND has incompatible technologies or near-zero overlap
  if (matchedKeywords.length === 0 && (hasIncompatibleTech || answerTokens.length < 5)) {
    return {
      rubric: {
        technicalCorrectness: 0,
        accuracy: 0,
        depth: 0,
        practicalApplication: 0,
        communication: 10,
        overallScore: 2, // 10 * 0.15 = 1.5 -> 2
      },
      coveredConcepts: [],
      partiallyCoveredConcepts: [],
      missingConcepts: expectedAnswer.coreConcepts,
      identifiedMisconceptions: hasIncompatibleTech
        ? [`Answer discussed unrelated technologies (${expectedAnswer.incompatibleDomains.filter(d => lowerAnswer.includes(d)).join(", ")}) instead of ${expectedAnswer.targetSkill}.`]
        : ["Answer did not address any required technical concepts."],
      strengths: [],
      gaps: [
        `The response was unrelated to ${expectedAnswer.targetSkill}. Focus directly on the question prompt.`,
      ],
      suggestedImprovement: `Frame your answer specifically around ${expectedAnswer.targetSkill} patterns rather than unrelated stacks.`,
      betterAnswer: expectedAnswer.idealReferenceAnswer,
      isAbstention: false,
      retrievedEvidence,
    };
  }

  // 5. Evaluate Concept Coverage
  const coveredConcepts: string[] = [];
  const partiallyCoveredConcepts: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of expectedAnswer.coreConcepts) {
    const conceptTokens = tokenize(concept);
    const matches = conceptTokens.filter((token) => lowerAnswer.includes(token));
    const coverageRatio = matches.length / Math.max(1, conceptTokens.length);

    if (coverageRatio >= 0.35 || matches.length >= 2) {
      coveredConcepts.push(concept);
    } else if (coverageRatio >= 0.15 || matchedKeywords.some((k) => concept.toLowerCase().includes(k))) {
      partiallyCoveredConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  // 6. Check for Explicitly Stated Misconceptions
  const identifiedMisconceptions: string[] = [];
  for (const mis of expectedAnswer.misconceptions) {
    const misLower = mis.toLowerCase();
    const isErroneousPatternStated =
      (misLower.includes("localstorage") && lowerAnswer.includes("localstorage")) ||
      (misLower.includes("plaintext") && lowerAnswer.includes("plaintext")) ||
      (misLower.includes("index as key") && (lowerAnswer.includes("index as key") || lowerAnswer.includes("use index"))) ||
      (misLower.includes("every column") && (lowerAnswer.includes("every column") || lowerAnswer.includes("every single column"))) ||
      (misLower.includes("globalscope") && lowerAnswer.includes("globalscope")) ||
      (misLower.includes("mutating state") && (lowerAnswer.includes("mutate state") || lowerAnswer.includes("mutate directly"))) ||
      (misLower.includes("request interceptors") && (lowerAnswer.includes("in request interceptor") || lowerAnswer.includes("interceptors.request")));

    if (isErroneousPatternStated) {
      identifiedMisconceptions.push(mis);
    }
  }

  // 7. Calculate 5-Dimension Rubric Scores Grounded in Evidence
  const totalConcepts = expectedAnswer.coreConcepts.length;
  const coverageScore = Math.min(
    100,
    Math.round(((coveredConcepts.length * 1.0 + partiallyCoveredConcepts.length * 0.5) / totalConcepts) * 100)
  );

  // Technical Correctness (30%): Concept coverage minus misconception penalties plus keyword alignment
  const keywordBonus = Math.min(25, matchedKeywords.length * 4);
  let techCorrectness = Math.max(
    0,
    Math.min(100, Math.round(coverageScore * 0.8 + keywordBonus - identifiedMisconceptions.length * 25))
  );
  if (coveredConcepts.length === 0 && partiallyCoveredConcepts.length === 0) {
    techCorrectness = Math.min(techCorrectness, 15);
  }

  // Accuracy (20%): Prompt adherence and domain precision
  let accuracy = Math.min(100, Math.max(10, Math.round(coverageScore * 0.75 + Math.min(25, matchedKeywords.length * 5))));
  if (hasIncompatibleTech) accuracy = Math.min(accuracy, 20);

  // Depth (20%): Implementation details, edge cases, trade-offs
  const detailsCovered = expectedAnswer.keyDetails.filter((d) =>
    tokenize(d).some((t) => lowerAnswer.includes(t))
  ).length;
  const tradeoffsCovered = expectedAnswer.tradeoffs.filter((t) =>
    tokenize(t).some((tok) => lowerAnswer.includes(tok))
  ).length;
  let depth = Math.min(95, Math.max(20, detailsCovered * 20 + tradeoffsCovered * 20 + (answerTokens.length >= 25 ? 20 : 10)));
  if (techCorrectness < 35) depth = Math.min(depth, 30);

  // Practical Application (15%): Concrete examples, patterns, and code terms
  const hasPracticalIndicators =
    lowerAnswer.includes("use") ||
    lowerAnswer.includes("implement") ||
    lowerAnswer.includes("pattern") ||
    lowerAnswer.includes("instance") ||
    lowerAnswer.includes("code") ||
    lowerAnswer.includes("example") ||
    lowerAnswer.includes("interceptors") ||
    lowerAnswer.includes("hook") ||
    lowerAnswer.includes("cookie") ||
    lowerAnswer.includes("index") ||
    lowerAnswer.includes("stateflow");
  let practical = hasPracticalIndicators && techCorrectness >= 30
    ? Math.min(95, Math.max(50, techCorrectness + 10))
    : Math.min(techCorrectness, 40);

  // Communication & Clarity (15%): Structure and clarity
  let communication = Math.min(95, Math.max(35, 50 + Math.min(35, answerTokens.length)));
  if (techCorrectness < 20) communication = Math.min(communication, 40);

  // Rubric Composite
  const overallScore = Math.round(
    techCorrectness * 0.30 +
    accuracy * 0.20 +
    depth * 0.20 +
    practical * 0.15 +
    communication * 0.15
  );

  // Compile Strengths & Gaps
  const strengths: string[] = [];
  if (coveredConcepts.length > 0) {
    strengths.push(`Accurately addressed: ${coveredConcepts.slice(0, 2).join("; ")}.`);
  }
  if (matchedKeywords.length >= 3) {
    strengths.push(`Applied relevant ${expectedAnswer.targetSkill} terminology (${matchedKeywords.slice(0, 4).join(", ")}).`);
  }
  if (detailsCovered > 0) {
    strengths.push("Demonstrated practical understanding of internal architecture.");
  }
  if (strengths.length === 0) {
    strengths.push("Attempted prompt with structured communication.");
  }

  const gaps: string[] = [];
  if (missingConcepts.length > 0) {
    gaps.push(`Missing core concepts: ${missingConcepts.slice(0, 2).join("; ")}.`);
  }
  if (identifiedMisconceptions.length > 0) {
    gaps.push(`Potential misconception: ${identifiedMisconceptions[0]}.`);
  }
  if (tradeoffsCovered === 0) {
    gaps.push("Did not discuss production trade-offs, edge cases, or failure recovery limits.");
  }

  const suggestedImprovement = missingConcepts.length > 0
    ? `Deepen explanation on ${missingConcepts[0]}. Detail specific error codes, state transitions, and concurrency safeguards.`
    : `Incorporate metrics monitoring and performance benchmarks under high concurrent traffic.`;

  return {
    rubric: {
      technicalCorrectness: techCorrectness,
      accuracy,
      depth,
      practicalApplication: practical,
      communication,
      overallScore,
    },
    coveredConcepts,
    partiallyCoveredConcepts,
    missingConcepts,
    identifiedMisconceptions,
    strengths,
    gaps,
    suggestedImprovement,
    betterAnswer: expectedAnswer.idealReferenceAnswer,
    isAbstention: false,
    retrievedEvidence,
  };
}
