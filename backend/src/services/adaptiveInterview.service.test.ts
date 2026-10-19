import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRubricComposite,
  determineNextAdaptiveAction,
  prioritizeInterviewTopics,
  evaluateAnswerWithRubric,
  generateAdaptiveQuestion,
  synthesizeAdaptiveInterviewReport,
  normalizeSkillName,
  getFallbackQuestionForSkill,
  CURATED_QUESTION_BANK,
} from "./adaptiveInterview.service";
import { IInterviewResponse } from "../models/InterviewSession";

describe("Adaptive AI Interview Engine — Phase 3 Test Suite", () => {
  // Test 1: Strong answers lead to harder questions
  it("1. Strong answers (score >= 80) lead to harder questions or high-difficulty topic advancement", () => {
    const decisionFromEasy = determineNextAdaptiveAction({
      lastEvaluationScore: 88,
      lastSkill: "JavaScript",
      currentDifficulty: "Easy",
      followupDepth: 0,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "JavaScript", score: 88, questionsCount: 1, status: "strong" }],
      unassessedSkills: ["React", "Node.js", "PostgreSQL"],
    });

    assert.equal(decisionFromEasy.nextAction, "harder_question");
    assert.equal(decisionFromEasy.nextDifficulty, "Medium");
    assert.equal(decisionFromEasy.targetSkill, "JavaScript");
    assert.match(decisionFromEasy.reason, /advancing to Medium difficulty/i);

    const decisionFromMedium = determineNextAdaptiveAction({
      lastEvaluationScore: 85,
      lastSkill: "React",
      currentDifficulty: "Medium",
      followupDepth: 0,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "React", score: 85, questionsCount: 1, status: "strong" }],
      unassessedSkills: ["Node.js", "Docker"],
    });

    assert.equal(decisionFromMedium.nextAction, "harder_question");
    assert.equal(decisionFromMedium.nextDifficulty, "Hard");
    assert.equal(decisionFromMedium.targetSkill, "React");
    assert.match(decisionFromMedium.reason, /advancing to Hard difficulty/i);
  });

  // Test 2: Partially correct answers trigger targeted clarification
  it("2. Partially correct answers (60 <= score < 80) trigger targeted clarification follow-ups", () => {
    const decision = determineNextAdaptiveAction({
      lastEvaluationScore: 72,
      lastSkill: "Node.js",
      currentDifficulty: "Medium",
      followupDepth: 0,
      maxFollowupDepth: 2,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "Node.js", score: 72, questionsCount: 1, status: "competent" }],
      unassessedSkills: ["PostgreSQL", "Docker"],
    });

    assert.equal(decision.nextAction, "follow_up");
    assert.equal(decision.targetSkill, "Node.js");
    assert.equal(decision.nextDifficulty, "Medium");
    assert.equal(decision.followupDepth, 1);
    assert.match(decision.reason, /partially complete.*probing with a targeted follow-up/i);
  });

  // Test 3: Weak answers trigger foundational or easier questions
  it("3. Weak answers (score < 60) trigger difficulty reduction or foundational verification", () => {
    const decisionFromHard = determineNextAdaptiveAction({
      lastEvaluationScore: 45,
      lastSkill: "PostgreSQL",
      currentDifficulty: "Hard",
      followupDepth: 0,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "PostgreSQL", score: 45, questionsCount: 1, status: "weak" }],
      unassessedSkills: ["Node.js", "React"],
    });

    assert.equal(decisionFromHard.nextAction, "easier_question");
    assert.equal(decisionFromHard.nextDifficulty, "Medium");
    assert.equal(decisionFromHard.targetSkill, "PostgreSQL");
    assert.match(decisionFromHard.reason, /reducing difficulty to Medium/i);

    const decisionFromMedium = determineNextAdaptiveAction({
      lastEvaluationScore: 50,
      lastSkill: "PostgreSQL",
      currentDifficulty: "Medium",
      followupDepth: 0,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "PostgreSQL", score: 50, questionsCount: 1, status: "weak" }],
      unassessedSkills: ["Node.js"],
    });

    assert.equal(decisionFromMedium.nextAction, "easier_question");
    assert.equal(decisionFromMedium.nextDifficulty, "Easy");
    assert.match(decisionFromMedium.reason, /reducing difficulty to Easy/i);
  });

  // Test 4: Required, unassessed skills receive top priority
  it("4. Required, unassessed skills receive suitable priority in topic selection", () => {
    const topics = prioritizeInterviewTopics({
      targetRole: "Full Stack Engineer",
      jobRequiredSkills: ["Node.js", "TypeScript"],
      jobPreferredSkills: ["GraphQL"],
      jobUnspecifiedSkills: ["Docker"],
      roadmapMissingSkills: ["PostgreSQL"],
      resumeSkills: ["HTML", "CSS"],
      assessedSkills: [],
    });

    // Required job skills (weight 4.0) must come before preferred (2.0) or resume (1.8)
    const nodeIdx = topics.indexOf("Node.js");
    const tsIdx = topics.indexOf("TypeScript");
    const pgIdx = topics.indexOf("PostgreSQL");
    const graphqlIdx = topics.indexOf("GraphQL");
    const htmlIdx = topics.indexOf("HTML");

    assert.ok(nodeIdx !== -1, "Node.js must be in prioritized topics");
    assert.ok(tsIdx !== -1, "TypeScript must be in prioritized topics");
    assert.ok(nodeIdx < graphqlIdx, "Required Node.js must precede preferred GraphQL");
    assert.ok(tsIdx < htmlIdx, "Required TypeScript must precede resume HTML");
    assert.ok(pgIdx < graphqlIdx, "Roadmap gap PostgreSQL must precede preferred GraphQL");
  });

  // Test 5: Already assessed skills are not repeatedly selected without justification
  it("5. Already assessed skills are deprioritized compared to unassessed skills", () => {
    const topicsWithAssessed = prioritizeInterviewTopics({
      targetRole: "Backend Engineer",
      jobRequiredSkills: ["Node.js", "PostgreSQL"],
      roadmapMissingSkills: ["Redis"],
      resumeSkills: ["Express.js"],
      assessedSkills: ["Node.js"], // Node.js was already assessed
    });

    const nodeIdx = topicsWithAssessed.indexOf("Node.js");
    const pgIdx = topicsWithAssessed.indexOf("PostgreSQL");
    const redisIdx = topicsWithAssessed.indexOf("Redis");

    assert.ok(pgIdx < nodeIdx, "Unassessed PostgreSQL must precede already assessed Node.js");
    assert.ok(redisIdx < nodeIdx, "Unassessed Redis must precede already assessed Node.js");
  });

  // Test 6: Follow-ups address the actual identified gap
  it("6. Follow-up generation incorporates parent question, answer, and identified gaps", async () => {
    const followupQ = await generateAdaptiveQuestion({
      targetRole: "Backend Engineer",
      targetCompany: "Google",
      targetSkill: "Node.js",
      difficulty: "Medium",
      isFollowup: true,
      parentQuestionText: "Explain how Node.js streams work.",
      parentAnswerText: "Streams let you read and write data in chunks.",
      identifiedGaps: ["Did not explain backpressure or memory consumption"],
      followupReason: "Investigate backpressure handling",
      questionIndex: 1,
    });

    assert.equal(followupQ.isFollowup, true);
    assert.equal(followupQ.skill, "Node.js");
    assert.ok(followupQ.text.length > 20);
    assert.match(followupQ.followupReason || "", /backpressure/i);
  });

  // Test 7: Duplicate questions are prevented
  it("7. Question bank generates distinct questions and normalized skill names", () => {
    const q1 = getFallbackQuestionForSkill("React", "Medium", "Frontend Engineer");
    const q2 = getFallbackQuestionForSkill("React", "Hard", "Frontend Engineer");

    assert.notEqual(q1, q2, "Medium and Hard questions for React must differ");
    assert.equal(normalizeSkillName("reactjs"), "React");
    assert.equal(normalizeSkillName("k8s"), "Kubernetes");
    assert.equal(normalizeSkillName("postgres"), "PostgreSQL");
  });

  // Test 8: Maximum question and follow-up limits are enforced
  it("8. Maximum question and follow-up limits are strictly enforced", () => {
    // A: Stop when current count reaches budget
    const budgetDecision = determineNextAdaptiveAction({
      lastEvaluationScore: 85,
      lastSkill: "JavaScript",
      currentDifficulty: "Medium",
      followupDepth: 0,
      currentQuestionCount: 5,
      maxQuestions: 5,
      assessedSkills: [{ skill: "JavaScript", score: 85, questionsCount: 1, status: "strong" }],
      unassessedSkills: ["React"],
    });

    assert.equal(budgetDecision.nextAction, "finish");
    assert.match(budgetDecision.reason, /Reached maximum interview question budget/i);

    // B: Max follow-up depth reached (depth 2) -> advances to next skill instead of looping
    const maxDepthDecision = determineNextAdaptiveAction({
      lastEvaluationScore: 68,
      lastSkill: "Node.js",
      currentDifficulty: "Medium",
      followupDepth: 2, // Already reached max depth 2
      maxFollowupDepth: 2,
      currentQuestionCount: 3,
      maxQuestions: 5,
      assessedSkills: [{ skill: "Node.js", score: 68, questionsCount: 2, status: "competent" }],
      unassessedSkills: ["PostgreSQL", "Docker"],
    });

    assert.equal(maxDepthDecision.nextAction, "next_skill");
    assert.equal(maxDepthDecision.targetSkill, "PostgreSQL");
    assert.equal(maxDepthDecision.followupDepth, 0);
    assert.match(maxDepthDecision.reason, /max depth 2 reached/i);
  });

  // Test 9: Interview completion and report generation
  it("9. Interview completion compiles accurate composite scores and aggregates", () => {
    const mockResponses: IInterviewResponse[] = [
      {
        questionId: "q1",
        questionText: "Explain JavaScript event loop",
        category: "Technical",
        skill: "JavaScript",
        userAnswer: "Microtasks execute before macrotasks.",
        accuracy: 90,
        communication: 85,
        technicalCorrectness: 88,
        depth: 82,
        confidence: 85,
        practicalApplication: 80,
        betterAnswer: "Full explanation of event loop...",
        followupQuestion: "",
        difficultyRating: "Medium",
        score: 86,
        evaluatedAt: new Date(),
      },
      {
        questionId: "q2",
        questionText: "How does React Virtual DOM work?",
        category: "Technical",
        skill: "React",
        userAnswer: "It reconciles diffs.",
        accuracy: 70,
        communication: 65,
        technicalCorrectness: 68,
        depth: 60,
        confidence: 65,
        practicalApplication: 62,
        betterAnswer: "Full reconciliation explanation...",
        followupQuestion: "",
        difficultyRating: "Medium",
        score: 66,
        evaluatedAt: new Date(),
      },
    ];

    const report = synthesizeAdaptiveInterviewReport({
      targetRole: "Full Stack Engineer",
      targetCompany: "Google",
      allTargetSkills: ["JavaScript", "React", "PostgreSQL", "Docker"],
      responses: mockResponses,
    });

    assert.equal(report.overallScore, 76);
    assert.equal(report.assessedSkills.length, 2);
    assert.equal(report.unassessedSkills.length, 2);
    assert.ok(report.unassessedSkills.includes("PostgreSQL"));
    assert.ok(report.unassessedSkills.includes("Docker"));
    assert.equal(report.assessedSkills[0].skill, "JavaScript");
    assert.equal(report.assessedSkills[0].status, "strong");
    assert.equal(report.assessedSkills[1].skill, "React");
    assert.equal(report.assessedSkills[1].status, "competent");
  });

  // Test 10: Empty answers are handled deterministically with 0 score
  it("10. Empty or whitespace-only answers are awarded 0 score without fabrication", async () => {
    const emptyEval = await evaluateAnswerWithRubric({
      questionText: "Explain SQL indexing",
      userAnswer: "   ",
      skill: "SQL",
      difficulty: "Medium",
      targetRole: "Backend Engineer",
      targetCompany: "Google",
    });

    assert.equal(emptyEval.rubric.overallScore, 0);
    assert.equal(emptyEval.rubric.technicalCorrectness, 0);
    assert.equal(emptyEval.rubric.accuracy, 0);
    assert.equal(emptyEval.rubric.depth, 0);
    assert.equal(emptyEval.strengths.length, 0);
    assert.match(emptyEval.gaps[0], /no answer provided/i);
    assert.equal(emptyEval.recommendedAction, "easier_question");
  });

  // Test 11: Malformed AI responses do not corrupt sessions
  it("11. Deterministic rubric calculation guarantees bounded scores between 0 and 100", () => {
    const clamped = calculateRubricComposite({
      technicalCorrectness: 120, // out of bounds
      accuracy: -10,             // out of bounds
      depth: 85,
      practicalApplication: 90,
      communication: 95,
    });

    assert.equal(clamped.technicalCorrectness, 100);
    assert.equal(clamped.accuracy, 0);
    assert.ok(clamped.overallScore >= 0 && clamped.overallScore <= 100);
  });

  // Test 12: Rubric weights are strictly respected
  it("12. Weighted formula accurately computes composite rubric score: 30% tech, 20% acc, 20% depth, 15% practical, 15% comm", () => {
    const rubric = calculateRubricComposite({
      technicalCorrectness: 100, // 30
      accuracy: 100,             // 20
      depth: 100,                // 20
      practicalApplication: 100, // 15
      communication: 100,        // 15
    });
    assert.equal(rubric.overallScore, 100);

    const partialRubric = calculateRubricComposite({
      technicalCorrectness: 80, // 24
      accuracy: 70,             // 14
      depth: 60,                // 12
      practicalApplication: 80, // 12
      communication: 90,        // 13.5
    });
    // Expected: 24 + 14 + 12 + 12 + 13.5 = 75.5 -> 76
    assert.equal(partialRubric.overallScore, 76);
  });

  // Test 13: Final report distinguishes assessed from unassessed skills
  it("13. Final report distinguishes assessed skills from untested target skills", () => {
    const report = synthesizeAdaptiveInterviewReport({
      targetRole: "DevOps Engineer",
      targetCompany: "Netflix",
      allTargetSkills: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"],
      responses: [
        {
          questionId: "q1",
          questionText: "What is Docker?",
          category: "DevOps",
          skill: "Docker",
          userAnswer: "Containerization tool",
          accuracy: 80,
          communication: 80,
          technicalCorrectness: 80,
          depth: 70,
          confidence: 80,
          practicalApplication: 75,
          betterAnswer: "...",
          followupQuestion: "",
          difficultyRating: "Medium",
          score: 78,
          evaluatedAt: new Date(),
        },
      ],
    });

    assert.equal(report.assessedSkills.length, 1);
    assert.equal(report.assessedSkills[0].skill, "Docker");
    assert.equal(report.unassessedSkills.length, 4);
    assert.ok(report.unassessedSkills.includes("Kubernetes"));
    assert.ok(report.unassessedSkills.includes("AWS"));
    assert.ok(report.unassessedSkills.includes("Terraform"));
    assert.ok(report.unassessedSkills.includes("CI/CD"));
  });

  // Test 14: Historical comparison calculates accurate deltas
  it("14. Historical comparison tracks improvement or regression against earlier sessions", () => {
    const report = synthesizeAdaptiveInterviewReport({
      targetRole: "Backend Engineer",
      targetCompany: "Amazon",
      allTargetSkills: ["Node.js"],
      responses: [
        {
          questionId: "q1",
          questionText: "Explain REST",
          category: "Backend",
          skill: "Node.js",
          userAnswer: "REST is architectural style.",
          accuracy: 85,
          communication: 85,
          technicalCorrectness: 85,
          depth: 85,
          confidence: 85,
          practicalApplication: 85,
          betterAnswer: "...",
          followupQuestion: "",
          difficultyRating: "Medium",
          score: 85,
          evaluatedAt: new Date(),
        },
      ],
      historicalSessions: [
        { overallScore: 70, createdAt: new Date(Date.now() - 86400000) },
        { overallScore: 72, createdAt: new Date(Date.now() - 172800000) },
      ],
    });

    assert.ok(report.historicalComparison);
    assert.equal(report.historicalComparison.previousAverageScore, 71);
    assert.equal(report.historicalComparison.scoreDelta, 14); // 85 - 71 = +14
    assert.match(report.historicalComparison.note, /\+14%/);
  });

  // Test 15: Curated question bank covers all essential categories
  it("15. Curated question bank covers Easy, Medium, and Hard tiers for essential skills", () => {
    const skillsToCheck = ["JavaScript", "TypeScript", "React", "Node.js", "Express.js", "REST APIs", "PostgreSQL", "MongoDB", "Docker", "System Design"];

    for (const skill of skillsToCheck) {
      assert.ok(CURATED_QUESTION_BANK[skill], `Question bank must contain ${skill}`);
      assert.ok(CURATED_QUESTION_BANK[skill].Easy.length > 0, `${skill} must have Easy questions`);
      assert.ok(CURATED_QUESTION_BANK[skill].Medium.length > 0, `${skill} must have Medium questions`);
      assert.ok(CURATED_QUESTION_BANK[skill].Hard.length > 0, `${skill} must have Hard questions`);
    }
  });

  // Test 16: Empty responses list in report synthesis handled gracefully
  it("16. Empty responses list handles zero division and returns safe defaults", () => {
    const emptyReport = synthesizeAdaptiveInterviewReport({
      targetRole: "AI Engineer",
      targetCompany: "Meta",
      allTargetSkills: ["Python", "PyTorch"],
      responses: [],
    });

    assert.equal(emptyReport.overallScore, 0);
    assert.equal(emptyReport.dimensionScores.technicalCorrectness, 0);
    assert.equal(emptyReport.assessedSkills.length, 0);
    assert.equal(emptyReport.unassessedSkills.length, 2);
  });

  // Test 17: Topic prioritization handles duplicate skills and casing
  it("17. Topic prioritization handles duplicate entries and alias normalization cleanly", () => {
    const topics = prioritizeInterviewTopics({
      targetRole: "Frontend Developer",
      jobRequiredSkills: ["ReactJS", "react", "REACT"],
      jobPreferredSkills: ["TypeScript", "typescript"],
      resumeSkills: ["Next.js", "nextjs"],
      assessedSkills: [],
    });

    const reactCount = topics.filter((t) => t === "React").length;
    const tsCount = topics.filter((t) => t === "TypeScript").length;
    const nextCount = topics.filter((t) => t === "Next.js").length;

    assert.equal(reactCount, 1, "React must only appear once");
    assert.equal(tsCount, 1, "TypeScript must only appear once");
    assert.equal(nextCount, 1, "Next.js must only appear once");
  });

  // Test 18: Fallback question generator handles unknown skill gracefully
  it("18. Fallback question generator synthesizes valid role-based question for unknown skills", () => {
    const qEasy = getFallbackQuestionForSkill("CustomQuantumFramework", "Easy", "Research Scientist");
    const qHard = getFallbackQuestionForSkill("CustomQuantumFramework", "Hard", "Research Scientist");

    assert.match(qEasy, /CustomQuantumFramework/);
    assert.match(qEasy, /core concepts/i);
    assert.match(qHard, /CustomQuantumFramework/);
    assert.match(qHard, /troubleshoot performance bottlenecks/i);
  });
});
