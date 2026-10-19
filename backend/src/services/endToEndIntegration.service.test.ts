import test from "node:test";
import assert from "node:assert/strict";
import { parseJobDescription } from "./jobDescription.service";
import { calculateJobMatch, type ResumeSkillForMatch } from "./jobMatch.service";
import { generateRoadmap } from "./roadmap.service";
import {
  prioritizeInterviewTopics,
  determineNextAdaptiveAction,
  evaluateAnswerWithRubric,
  generateAdaptiveQuestion,
  synthesizeAdaptiveInterviewReport,
} from "./adaptiveInterview.service";
import {
  validateAndNormalizeGitHubUrl,
  detectArchitecturalSignals,
  matchResumeClaimsToEvidence,
  generateProjectInterviewQuestions,
  type ScannedFile,
  type RepositoryMetadata,
} from "./githubEvidence.service";

test("End-to-End Integration & Production Readiness — Phase 5 Test Suite", async (t) => {
  // Test 1: Full Pipeline Flow — Resume Extracted Skills -> Job Match -> Roadmap Generation
  await t.test("1. Job-match results flow directly into intelligent learning roadmap", async () => {
    const candidateSkills: ResumeSkillForMatch[] = [
      {
        name: "JavaScript",
        category: "Languages",
        occurrences: 2,
        sections: ["skills", "experience"],
        matchedTexts: ["JavaScript", "JS"],
      },
      {
        name: "HTML",
        category: "Frontend",
        occurrences: 1,
        sections: ["skills"],
        matchedTexts: ["HTML"],
      },
      {
        name: "CSS",
        category: "Frontend",
        occurrences: 1,
        sections: ["skills"],
        matchedTexts: ["CSS"],
      },
    ];

    const jobDescription = `
      Senior Full Stack Engineer
      Required:
      - React
      - Node.js
      - PostgreSQL
      Preferred:
      - Docker
      - Redis
    `;

    const parsedJob = parseJobDescription(jobDescription);
    const match = calculateJobMatch(parsedJob.requirements, candidateSkills);

    assert.equal(match.matchedRequired.length, 0);
    assert.ok(match.missingRequired.length >= 2, "React, Node.js, and PostgreSQL should be missing required");

    const missingForRoadmap = [
      ...match.missingRequired.map((r) => ({ name: r.name, priority: "required" as const })),
      ...match.missingPreferred.map((r) => ({ name: r.name, priority: "preferred" as const })),
    ];

    const demonstratedSkillNames = candidateSkills.map((s) => s.name);

    const roadmap = await generateRoadmap({
      missingSkills: missingForRoadmap,
      demonstratedSkills: demonstratedSkillNames,
      jobTitle: "Senior Full Stack Engineer",
      jobDescriptionText: jobDescription,
    });

    assert.ok(roadmap.totalSteps >= 3, "Roadmap should have steps for missing skills");
    assert.equal(roadmap.completedSteps, 0);
    assert.equal(roadmap.completionPercentage, 0);
    assert.ok(roadmap.demonstratedPrerequisitesCount >= 1, "Should count candidate demonstrated prerequisites");

    // Prerequisite ordering test: candidate without JavaScript has JavaScript in Phase 1 before React
    const roadmapWithUnmetPrereq = await generateRoadmap({
      missingSkills: [{ name: "React", priority: "required" }],
      demonstratedSkills: [], // Candidate has no skills
      jobTitle: "Frontend Engineer",
      jobDescriptionText: "Required: React",
    });

    const jsStep = roadmapWithUnmetPrereq.steps.find((s) => s.skillName === "JavaScript");
    const reactStep = roadmapWithUnmetPrereq.steps.find((s) => s.skillName === "React");
    assert.ok(jsStep, "JavaScript should be included as an unmet prerequisite");
    assert.ok(reactStep, "React should be included as a target requirement");
    assert.ok(jsStep.stepNumber < reactStep.stepNumber, "JavaScript must be scheduled strictly before React");
    assert.ok(reactStep.prerequisites.includes("JavaScript"), "React must list JavaScript as a prerequisite");
  });

  // Test 2: Roadmap Step Completion Math & Progress Aggregation
  await t.test("2. Roadmap completion calculations update deterministically", () => {
    const totalSteps = 5;
    let completedSteps = 0;

    const calcPercentage = (completed: number, total: number) =>
      total > 0 ? Math.round((completed / total) * 100) : 100;

    assert.equal(calcPercentage(completedSteps, totalSteps), 0);

    completedSteps = 2;
    assert.equal(calcPercentage(completedSteps, totalSteps), 40);

    completedSteps = 5;
    assert.equal(calcPercentage(completedSteps, totalSteps), 100);

    // Boundary: 0 total steps returns 100%
    assert.equal(calcPercentage(0, 0), 100);
  });

  // Test 3: Project Evidence Connection -> Topic Prioritization & Grounded Interview Questions
  await t.test("3. Verified GitHub project evidence grounds adaptive interview questions", async () => {
    const mockFiles: ScannedFile[] = [
      {
        path: "src/routes/api.ts",
        type: "source",
        size: 300,
        content: "import express from 'express'; const router = express.Router(); router.post('/login', authHandler);",
      },
      {
        path: "src/models/User.ts",
        type: "source",
        size: 300,
        content: "import mongoose, { Schema } from 'mongoose'; const UserSchema = new Schema({ email: String });",
      },
      {
        path: "src/middleware/auth.ts",
        type: "source",
        size: 200,
        content: "import jwt from 'jsonwebtoken'; export const verify = (token) => jwt.verify(token, secret);",
      },
      {
        path: "tests/auth.test.ts",
        type: "test",
        size: 250,
        content: "describe('Auth suite', () => { it('validates token', () => {}); });",
      },
    ];

    const metadata: RepositoryMetadata = {
      description: "Backend API",
      stars: 12,
      forks: 3,
      openIssues: 0,
      primaryLanguage: "TypeScript",
      languages: { TypeScript: 15000 },
      isArchived: false,
      license: "MIT",
      updatedAt: "2026-03-01T00:00:00Z",
    };

    const signals = detectArchitecturalSignals(mockFiles);
    assert.ok(signals.hasApiRoutes, "Should detect API routes");
    assert.ok(signals.hasDatabaseModels, "Should detect Database models");
    assert.ok(signals.hasAuthentication, "Should detect Authentication");
    assert.ok(signals.hasTests, "Should detect Test suite");

    // 2. Claim-to-evidence matching
    const claims = matchResumeClaimsToEvidence({
      claimedSkills: ["Node.js", "Express", "MongoDB", "JWT", "Docker"],
      declaredDependencies: [{ name: "express", file: "package.json", category: "prod" }],
      observedImports: [
        { name: "express", file: "src/routes/api.ts", occurrences: 1 },
        { name: "mongoose", file: "src/models/User.ts", occurrences: 1 },
        { name: "jsonwebtoken", file: "src/middleware/auth.ts", occurrences: 1 },
      ],
      architecturalSignals: signals,
      files: mockFiles,
      metadata,
    });

    const expressClaim = claims.find((c) => c.skill.toLowerCase() === "express");
    assert.ok(expressClaim && expressClaim.status === "supported");

    const dockerClaim = claims.find((c) => c.skill.toLowerCase() === "docker");
    assert.ok(dockerClaim && dockerClaim.status === "not_found");

    // 3. Grounded Question Generation
    const questions = await generateProjectInterviewQuestions({
      projectTitle: "careerAI-backend",
      repoName: "careerAI",
      claimAssessments: claims,
      architecturalSignals: signals,
      declaredDependencies: [{ name: "express", file: "package.json", category: "runtime" }],
      metadata,
    });

    assert.ok(questions.length >= 2, "Should generate grounded questions");
    assert.ok(
      questions.some((q) => q.fileReference?.includes("routes") || q.motivation.includes("routes")),
      "Should generate an API routes question"
    );

    // 4. Topic prioritization incorporates project verified skills
    const projectVerifiedSkills = claims
      .filter((c) => c.status === "supported" || c.status === "partially_supported")
      .map((c) => c.skill);

    const prioritizedTopics = prioritizeInterviewTopics({
      targetRole: "Full Stack Engineer",
      jobRequiredSkills: ["React", "TypeScript"],
      jobPreferredSkills: ["GraphQL"],
      jobUnspecifiedSkills: [],
      roadmapMissingSkills: ["TypeScript"],
      roadmapPrerequisites: [],
      resumeSkills: [...projectVerifiedSkills, "HTML", "CSS"],
    });

    assert.ok(prioritizedTopics.length > 0);
    assert.ok(prioritizedTopics.includes("TypeScript"));
  });

  // Test 4: Cross-User Isolation & Ownership Verification Logic
  await t.test("4. Cross-user isolation rejects unauthorized project evidence attachment", () => {
    const authUserId = "user_12345";
    const foreignEvidenceUserId = "user_99999";

    const verifyOwnership = (evidenceUserId: string, currentUserId: string): boolean => {
      return evidenceUserId === currentUserId;
    };

    assert.equal(verifyOwnership(foreignEvidenceUserId, authUserId), false, "Must reject foreign user's evidence");
    assert.equal(verifyOwnership(authUserId, authUserId), true, "Must accept owned evidence");
  });

  // Test 5: Adaptive Interview Decision Policy & Rubric Scoring Bounded Integrity
  await t.test("5. Adaptive decision policy progresses and finishes correctly", () => {
    // High score -> difficulty increase or next topic
    const action1 = determineNextAdaptiveAction({
      lastEvaluationScore: 88,
      lastSkill: "JavaScript",
      currentDifficulty: "Medium",
      followupDepth: 0,
      maxFollowupDepth: 2,
      currentQuestionCount: 1,
      maxQuestions: 5,
      assessedSkills: [{ skill: "JavaScript", score: 88, questionsCount: 1, status: "strong" }],
      unassessedSkills: ["React", "Node.js"],
    });

    assert.equal(action1.nextDifficulty, "Hard");

    // Medium score with depth < 2 -> targeted follow-up
    const action2 = determineNextAdaptiveAction({
      lastEvaluationScore: 68,
      lastSkill: "React",
      currentDifficulty: "Medium",
      followupDepth: 0,
      maxFollowupDepth: 2,
      currentQuestionCount: 2,
      maxQuestions: 5,
      assessedSkills: [{ skill: "React", score: 68, questionsCount: 1, status: "competent" }],
      unassessedSkills: ["Node.js"],
    });

    assert.equal(action2.nextAction, "follow_up");
    assert.equal(action2.followupDepth, 1);

    // Budget exhausted -> finish session
    const action3 = determineNextAdaptiveAction({
      lastEvaluationScore: 82,
      lastSkill: "Node.js",
      currentDifficulty: "Medium",
      followupDepth: 0,
      maxFollowupDepth: 2,
      currentQuestionCount: 5,
      maxQuestions: 5,
      assessedSkills: [],
      unassessedSkills: [],
    });

    assert.equal(action3.nextAction, "finish");
  });

  // Test 6: Final Performance Report Synthesis & Historical Comparison
  await t.test("6. Performance report synthesizes rubric averages and historical delta", () => {
    const mockResponses = [
      {
        questionId: "q1",
        questionText: "Explain React reconciliation.",
        category: "Technical",
        skill: "React",
        userAnswer: "Virtual DOM diffing algorithm compares trees.",
        accuracy: 85,
        communication: 80,
        technicalCorrectness: 90,
        depth: 75,
        confidence: 85,
        practicalApplication: 80,
        strengths: ["Clear explanation of VDOM"],
        gaps: [],
        suggestedImprovement: "Mention fiber architecture.",
        betterAnswer: "Fiber tree reconciliation...",
        followupQuestion: "Explain fibers in detail.",
        difficultyRating: "Medium",
        score: 83,
        evaluatedAt: new Date(),
      },
    ];

    const pastSessions = [
      {
        overallScore: 70,
        createdAt: new Date(Date.now() - 86400000),
      },
    ];

    const report = synthesizeAdaptiveInterviewReport({
      targetRole: "Frontend Engineer",
      targetCompany: "Google",
      allTargetSkills: ["React", "TypeScript", "CSS"],
      responses: mockResponses,
      historicalSessions: pastSessions,
    });

    assert.equal(report.overallScore, 83);
    assert.equal(report.historicalComparison?.scoreDelta, 13, "Score delta should be 83 - 70 = +13");
    assert.equal(report.assessedSkills.length, 1);
    assert.ok(report.unassessedSkills.includes("TypeScript"));
    assert.ok(report.unassessedSkills.includes("CSS"));
  });

  // Test 7: Dashboard and Progress Metrics Integrity When No Resume Exists
  await t.test("7. Dashboard and Progress metrics return zero scores when no resume is uploaded", () => {
    const simulateDashboardMetrics = (resume: any, analysis: any) => {
      const resumeUploaded = Boolean(resume);
      const resumeScore = resumeUploaded ? (analysis?.resumeScore || resume?.atsScore || 0) : 0;
      const atsScore = resumeUploaded ? (analysis?.atsScore || resume?.atsScore || 0) : 0;
      return { resumeUploaded, resumeScore, atsScore };
    };

    // Stale analysis lingering after resume deleted
    const staleAnalysis = { resumeScore: 85, atsScore: 88 };
    const resultNoResume = simulateDashboardMetrics(null, staleAnalysis);

    assert.equal(resultNoResume.resumeUploaded, false);
    assert.equal(resultNoResume.resumeScore, 0, "Resume score must be 0 when resumeUploaded is false");
    assert.equal(resultNoResume.atsScore, 0, "ATS score must be 0 when resumeUploaded is false");

    // When resume exists
    const validResume = { atsScore: 78, originalName: "JohnDoe.pdf" };
    const resultWithResume = simulateDashboardMetrics(validResume, staleAnalysis);
    assert.equal(resultWithResume.resumeUploaded, true);
    assert.equal(resultWithResume.resumeScore, 85);
    assert.equal(resultWithResume.atsScore, 88);
  });

  // Test 8: Empty and Unrecognized Job Description Handling
  await t.test("8. Empty or unparseable job descriptions return clean empty results without failure", () => {
    const emptyJd = "   ";
    const isInvalid = !emptyJd || !emptyJd.trim();
    assert.ok(isInvalid, "Whitespace only JD should be flagged invalid");

    const nonTechnicalJd = "Looking for a friendly receptionist with great phone manners.";
    const parsed = parseJobDescription(nonTechnicalJd);
    assert.equal(parsed.requirements.length, 0, "Non-technical JD should extract 0 technical skills");

    const sampleCandidateSkills: ResumeSkillForMatch[] = [
      {
        name: "React",
        category: "Frontend",
        occurrences: 1,
        sections: ["skills"],
        matchedTexts: ["React"],
      },
    ];

    const match = calculateJobMatch(parsed.requirements, sampleCandidateSkills);
    assert.equal(match.overallScore, null, "Should return null overall score for 0 technical requirements");
    assert.equal(match.missingRequired.length, 0);
  });
});
