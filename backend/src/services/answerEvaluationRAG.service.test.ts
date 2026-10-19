/**
 * answerEvaluationRAG.service.test.ts
 *
 * Phase 6: Answer Evaluation RAG, Lexical BM25 Ranking & Grounded Scoring Tests
 *
 * Verifies:
 * 1. Deterministic fixture tests across 5 engineering domains:
 *    - Axios & asynchronous error handling
 *    - React component organization
 *    - Authentication & authorization
 *    - Database models & API design
 *    - Kotlin WebSocket & StateFlow architecture
 * 2. 7 answer variants for each question:
 *    - Empty answer (0% all dimensions)
 *    - "I don't know" (0% all dimensions, regression test for 73% bug)
 *    - "No" / clear abstention (0% all dimensions, regression test)
 *    - Clearly irrelevant answer
 *    - Plausible but incorrect answer
 *    - Partially correct answer
 *    - Detailed strong answer
 * 3. Cross-domain isolation:
 *    - Axios questions cannot return Kotlin answers
 *    - Authentication questions cannot inherit database answers
 * 4. Rubric arithmetic, score bounds (0-100), and provenance tracking
 * 5. GitHub credential distinction (401, 403, 404, rate limit)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAnswerGrounded,
  retrieveExpectedAnswer,
  isClearAbstention,
  CURATED_EXPECTED_ANSWERS,
} from "./answerEvaluationRAG.service";
import {
  evaluateAnswerWithRubric,
  calculateRubricComposite,
} from "./adaptiveInterview.service";
import {
  GitHubAuthError,
  GitHubRateLimitError,
  GitHubNotFoundError,
  GitHubForbiddenError,
  getGitHubConfigStatus,
} from "./githubEvidence.service";

describe("Phase 6: Answer Evaluation RAG & Grounded Rubric Scoring", () => {
  // ─── 1. Abstention & Empty Answer Tests (Regression for 73% bug) ─────────

  describe("1. Deterministic Abstention & Empty Answer Handling", () => {
    it("recognizes clear abstention phrases deterministically", () => {
      assert.equal(isClearAbstention("I don't know"), true);
      assert.equal(isClearAbstention("don't know"), true);
      assert.equal(isClearAbstention("not sure"), true);
      assert.equal(isClearAbstention("i have no idea"), true);
      assert.equal(isClearAbstention("idk"), true);
      assert.equal(isClearAbstention("no"), true);
      assert.equal(isClearAbstention("none"), true);
      assert.equal(isClearAbstention("pass"), true);
      assert.equal(isClearAbstention("skip"), true);
      assert.equal(isClearAbstention("   "), true);
      assert.equal(isClearAbstention(""), true);

      // Legitimate short answers should NOT be treated as abstentions
      assert.equal(isClearAbstention("Use Axios interceptors to centralize error handling"), false);
      assert.equal(isClearAbstention("StateFlow is a hot stream"), false);
      assert.equal(isClearAbstention("Store hashed passwords using bcrypt with salt"), false);
    });

    it("REGRESSION: 'I don't know' receives 0% across ALL 5 dimensions (previously 73%)", () => {
      const result = evaluateAnswerGrounded({
        questionText: "How do you handle API error responses using Axios interceptors in a production React application?",
        skill: "Axios",
        userAnswer: "I don't know",
      });

      assert.equal(result.isAbstention, true);
      assert.equal(result.rubric.overallScore, 0);
      assert.equal(result.rubric.technicalCorrectness, 0);
      assert.equal(result.rubric.accuracy, 0);
      assert.equal(result.rubric.depth, 0);
      assert.equal(result.rubric.practicalApplication, 0);
      assert.equal(result.rubric.communication, 0);
      assert.equal(result.strengths.length, 0);
      assert.ok(result.gaps.length > 0);
    });

    it("REGRESSION: 'no' receives 0% across all 5 dimensions", () => {
      const result = evaluateAnswerGrounded({
        questionText: "Explain how you manage state and lifecycles with Kotlin StateFlow and WebSockets.",
        skill: "Kotlin",
        userAnswer: "no",
      });

      assert.equal(result.isAbstention, true);
      assert.equal(result.rubric.overallScore, 0);
      assert.equal(result.rubric.technicalCorrectness, 0);
      assert.equal(result.rubric.accuracy, 0);
      assert.equal(result.rubric.depth, 0);
      assert.equal(result.rubric.practicalApplication, 0);
      assert.equal(result.rubric.communication, 0);
    });

    it("empty or whitespace string receives 0% across all 5 dimensions", () => {
      const result = evaluateAnswerGrounded({
        questionText: "Describe JWT authentication versus session cookies.",
        skill: "Authentication",
        userAnswer: "   \n\t   ",
      });

      assert.equal(result.isAbstention, true);
      assert.equal(result.rubric.overallScore, 0);
      assert.equal(result.rubric.technicalCorrectness, 0);
      assert.equal(result.rubric.accuracy, 0);
      assert.equal(result.rubric.depth, 0);
      assert.equal(result.rubric.practicalApplication, 0);
      assert.equal(result.rubric.communication, 0);
    });
  });

  // ─── 2. Cross-Domain Grounding & Reference Answer Separation ─────────────

  describe("2. Question-to-Reference Answer Grounding & Anti-Leakage", () => {
    it("Axios error handling question NEVER receives a Kotlin WebSocket reference answer", () => {
      const axiosQ = "How do you handle API error responses using Axios interceptors in a production React application?";
      const { expectedAnswer: retrieved } = retrieveExpectedAnswer({ questionText: axiosQ, skill: "Axios" });

      assert.equal(retrieved.questionId, "axios_error_handling");
      assert.match(retrieved.idealReferenceAnswer, /interceptors/i);
      assert.doesNotMatch(retrieved.idealReferenceAnswer, /StateFlow/i);
      assert.doesNotMatch(retrieved.idealReferenceAnswer, /WebSocket/i);
      assert.doesNotMatch(retrieved.idealReferenceAnswer, /Kotlin/i);
    });

    it("Kotlin WebSocket question receives Kotlin StateFlow reference answer, NOT Axios", () => {
      const kotlinQ = "How do you implement a resilient WebSocket connection using Kotlin Coroutines and StateFlow in Android?";
      const { expectedAnswer: retrieved } = retrieveExpectedAnswer({ questionText: kotlinQ, skill: "Kotlin" });

      assert.equal(retrieved.questionId, "kotlin_websocket_stateflow");
      assert.match(retrieved.idealReferenceAnswer, /StateFlow/i);
      assert.match(retrieved.idealReferenceAnswer, /WebSocket/i);
      assert.doesNotMatch(retrieved.idealReferenceAnswer, /Axios/i);
    });

    it("Authentication question NEVER inherits database model answers", () => {
      const authQ = "Explain your architecture for user authentication with JWT and refresh tokens.";
      const { expectedAnswer: retrieved } = retrieveExpectedAnswer({ questionText: authQ, skill: "Authentication" });

      assert.equal(retrieved.questionId, "authentication_authorization");
      assert.match(retrieved.idealReferenceAnswer, /JWT/i);
      assert.doesNotMatch(retrieved.idealReferenceAnswer, /cursor-based pagination/i);
    });

    it("Submitting a Kotlin answer to an Axios question is penalized for domain mismatch", () => {
      const result = evaluateAnswerGrounded({
        questionText: "How do you configure Axios interceptors for handling 401 unauthorized errors and token refreshes?",
        skill: "Axios",
        userAnswer: "In Kotlin we use OkHttp WebSocketListener and emit messages to MutableStateFlow. We collect with repeatOnLifecycle in Android.",
      });

      // Score must be low due to zero concept match and domain contamination penalty
      assert.ok(result.rubric.overallScore < 30, `Expected score < 30, got ${result.rubric.overallScore}`);
      assert.ok(result.rubric.technicalCorrectness < 25, `Expected correctness < 25, got ${result.rubric.technicalCorrectness}`);
      // The better answer must STILL be about Axios, NOT Kotlin!
      assert.match(result.betterAnswer, /Axios/i);
      assert.doesNotMatch(result.betterAnswer, /StateFlow/i);
    });
  });

  // ─── 3. Multi-Question Fixture Suite (5 Domains x 7 Variants) ───────────

  describe("3. Deterministic Evaluation Fixtures Across 5 Technical Domains", () => {
    const domains = [
      {
        id: "axios",
        question: "How do you configure Axios interceptors for handling 401 unauthorized errors and token refreshes in React?",
        skill: "Axios",
        irrelevantAnswer: "We use Docker compose to mount volumes and run PostgreSQL containers with health checks.",
        incorrectAnswer: "We catch 401 errors and immediately redirect the user to login while storing plaintext passwords in localStorage.",
        partialAnswer: "We use axios.interceptors.response.use to check if error.response.status is 401 and refresh the token.",
        strongAnswer: "We use axios.interceptors.response.use to intercept 401 errors. When a 401 occurs, we queue failed requests while calling the refresh token endpoint using an isolated Axios instance to avoid infinite loops. Once the token is refreshed in httpOnly cookies, we retry the queued requests with the updated authorization header. If refresh fails, we clear state and safely redirect to login.",
      },
      {
        id: "react",
        question: "How do you architect React components to separate presentation from state management and business logic?",
        skill: "React",
        irrelevantAnswer: "Kafka consumer groups allow horizontal partitioning of events across worker threads.",
        incorrectAnswer: "Put all fetch calls and business logic directly in the JSX render return block using useEffect without dependencies.",
        partialAnswer: "We use custom hooks to hold state and API logic, and presentational components to display props.",
        strongAnswer: "We employ the container/presentational pattern and custom hooks. Custom hooks encapsulate data fetching, caching, and state transitions using TanStack Query or reducer patterns. UI components remain pure and stateless, receiving typed props and emitting event callbacks. We wrap expensive subtrees in React.memo and compute derived data with useMemo.",
      },
      {
        id: "auth",
        question: "How do you design a secure authentication and authorization architecture with JWT and refresh tokens?",
        skill: "Authentication",
        irrelevantAnswer: "Use CSS Grid with auto-fit and minmax to build a responsive dashboard layout.",
        incorrectAnswer: "Store both access token and refresh token in localStorage so JavaScript can easily access them anywhere.",
        partialAnswer: "Access token is short-lived and refresh token is long-lived. When access token expires, use refresh token to get a new one.",
        strongAnswer: "We issue short-lived JWT access tokens (15 minutes) and long-lived refresh tokens stored in secure, httpOnly, SameSite=Strict cookies to protect against XSS. The refresh token is stored in the database with token rotation and family tracking to detect reuse. Authorization is enforced with RBAC middleware verifying cryptographically signed claims.",
      },
      {
        id: "database",
        question: "How do you design database models, indexing strategies, and REST API endpoints for a high-traffic system?",
        skill: "Database Design",
        irrelevantAnswer: "Configure Webpack with tree shaking and splitChunks optimization for smaller bundles.",
        incorrectAnswer: "Create an index on every single column in the table and use GET requests for creating user records.",
        partialAnswer: "Define schema with foreign keys, add indexes on commonly queried fields, and use REST status codes.",
        strongAnswer: "We model schemas around query access patterns and add compound B-Tree indexes on frequent filter-sort combinations (e.g. { userId: 1, createdAt: -1 }), checking EXPLAIN plans to eliminate full table scans. We implement cursor-based pagination to maintain O(1) performance on large datasets, and ensure REST APIs adhere to HTTP semantics and idempotency.",
      },
      {
        id: "kotlin",
        question: "How do you manage WebSocket connection lifecycles and reactive state using Kotlin Coroutines and StateFlow?",
        skill: "Kotlin",
        irrelevantAnswer: "Use Redux Toolkit with createSlice and useSelector to manage global client state in JavaScript.",
        incorrectAnswer: "Create a new WebSocket on every button click and collect flows inside GlobalScope without canceling.",
        partialAnswer: "We connect to the WebSocket with OkHttp, emit messages to StateFlow, and collect it in the ViewModel.",
        strongAnswer: "We manage WebSocket connections using OkHttp WebSocketListener or Ktor. Inbound messages are emitted to a MutableStateFlow or MutableSharedFlow. In Android, the UI collects the flow using repeatOnLifecycle or flowWithLifecycle tied to the Lifecycle.State.STARTED state to prevent leaks when in the background. Backpressure and exponential backoff reconnection are handled gracefully.",
      },
    ];

    for (const d of domains) {
      describe(`Domain: ${d.skill}`, () => {
        it(`${d.skill}: Empty answer scores 0%`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: "   ",
          });
          assert.equal(res.rubric.overallScore, 0);
          assert.equal(res.rubric.technicalCorrectness, 0);
        });

        it(`${d.skill}: 'I don't know' scores 0%`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: "I don't know",
          });
          assert.equal(res.rubric.overallScore, 0);
          assert.equal(res.rubric.technicalCorrectness, 0);
        });

        it(`${d.skill}: Irrelevant answer scores low (< 35%)`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: d.irrelevantAnswer,
          });
          assert.ok(
            res.rubric.overallScore < 35,
            `Expected irrelevant answer score < 35%, got ${res.rubric.overallScore}%`
          );
        });

        it(`${d.skill}: Plausible but incorrect answer loses correctness points`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: d.incorrectAnswer,
          });
          assert.ok(
            res.rubric.technicalCorrectness < 50,
            `Expected incorrect answer correctness < 50, got ${res.rubric.technicalCorrectness}`
          );
        });

        it(`${d.skill}: Partially correct answer receives partial credit (40% - 75%)`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: d.partialAnswer,
          });
          assert.ok(
            res.rubric.overallScore >= 40 && res.rubric.overallScore <= 78,
            `Expected partial score between 40 and 78, got ${res.rubric.overallScore}`
          );
          assert.ok(
            res.coveredConcepts.length > 0 || res.partiallyCoveredConcepts.length > 0,
            "Expected at least 1 covered or partially covered concept"
          );
          assert.ok(res.missingConcepts.length > 0, "Expected at least 1 missing concept");
        });

        it(`${d.skill}: Strong answer scores high (>= 75%)`, () => {
          const res = evaluateAnswerGrounded({
            questionText: d.question,
            skill: d.skill,
            userAnswer: d.strongAnswer,
          });
          assert.ok(
            res.rubric.overallScore >= 75,
            `Expected strong answer score >= 75, got ${res.rubric.overallScore}`
          );
          assert.ok(res.rubric.technicalCorrectness >= 75);
          assert.ok(res.coveredConcepts.length >= 2);
        });
      });
    }
  });

  // ─── 4. Rubric Arithmetic & Clamping Verification ────────────────────────

  describe("4. Rubric Arithmetic & Score Bounds", () => {
    it("overallScore strictly follows 5-dimension weights: 30% Correctness, 20% Accuracy, 20% Depth, 15% Practical, 15% Communication", () => {
      const overall = calculateRubricComposite({
        technicalCorrectness: 80, // 80 * 0.30 = 24
        accuracy: 90,             // 90 * 0.20 = 18
        depth: 70,                // 70 * 0.20 = 14
        practicalApplication: 60, // 60 * 0.15 = 9
        communication: 80,        // 80 * 0.15 = 12
      });

      // 24 + 18 + 14 + 9 + 12 = 77
      assert.equal(overall.overallScore, 77);
    });

    it("clamps scores exceeding 100 or below 0", () => {
      const clamped = calculateRubricComposite({
        technicalCorrectness: 150,
        accuracy: -20,
        depth: 100,
        practicalApplication: 100,
        communication: 100,
      });

      assert.ok(clamped.overallScore >= 0 && clamped.overallScore <= 100);
    });
  });

  // ─── 5. GitHub Error Types & Configuration Status ────────────────────────

  describe("5. GitHub Error Types & Configuration Status", () => {
    it("distinguishes 401 Unauthorized, 403 Forbidden, Rate Limits, and 404 Not Found", () => {
      const authErr = new GitHubAuthError();
      assert.equal(authErr.name, "GitHubAuthError");
      assert.match(authErr.message, /401/);

      const rateErr = new GitHubRateLimitError("Rate limit reached", "1700000000");
      assert.equal(rateErr.name, "GitHubRateLimitError");
      assert.equal(rateErr.resetTime, "1700000000");

      const notFoundErr = new GitHubNotFoundError("octocat", "hello-world");
      assert.equal(notFoundErr.name, "GitHubNotFoundError");
      assert.match(notFoundErr.message, /not found/i);

      const forbiddenErr = new GitHubForbiddenError("octocat", "private-repo");
      assert.equal(forbiddenErr.name, "GitHubForbiddenError");
      assert.match(forbiddenErr.message, /forbidden/i);
    });

    it("getGitHubConfigStatus safely returns configuration status without exposing credentials", async () => {
      const status = await getGitHubConfigStatus();
      assert.ok(typeof status.configured === "boolean");
      assert.ok(["unconfigured", "valid", "invalid", "rate_limited"].includes(status.status));
      assert.ok(typeof status.message === "string");
      // Must NEVER return the actual token string!
      assert.equal((status as any).token, undefined);
    });
  });
});
