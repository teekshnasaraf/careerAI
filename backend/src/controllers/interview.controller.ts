import { Request, Response } from "express";
import Resume from "../models/Resume";
import Analysis from "../models/Analysis";
import InterviewSession, { IAssessedSkillSummary, IInterviewReport, IInterviewResponse } from "../models/InterviewSession";
import Roadmap from "../models/Roadmap";
import ProjectEvidence from "../models/ProjectEvidence";
import { parseJobDescription } from "../services/jobDescription.service";
import {
  prioritizeInterviewTopics,
  determineNextAdaptiveAction,
  evaluateAnswerWithRubric,
  generateAdaptiveQuestion,
  synthesizeAdaptiveInterviewReport,
  InterviewDifficulty,
  normalizeSkillName,
} from "../services/adaptiveInterview.service";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateWithFallback(prompt: string): Promise<string> {
  if (!ai || process.env.NODE_ENV === "test") return "";
  const models = ["gemini-2.0-flash", "models/gemma-4-26b-a4b-it", "gemini-2.0-flash-lite"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      if (response.text) return response.text;
    } catch (err) {
      console.warn(`Model ${model} failed in interview controller, trying fallback...`);
    }
  }
  return "";
}

/**
 * Starts a new interview session (Adaptive AI or Fixed Mock).
 */
export const startInterviewSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode, difficulty, length, targetCompany, targetRole, jobDescription, isAdaptive, projectEvidenceId } = req.body;

    const resume = await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const analysis = await Analysis.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const roadmap = await Roadmap.findOne({ user: req.userId }).sort({ updatedAt: -1 });

    let projectContextData:
      | {
          projectTitle: string;
          repositoryUrl: string;
          findingsSummary?: string;
          fileReference?: string;
          primaryTechnologies?: string[];
        }
      | undefined = undefined;

    let projectVerifiedSkills: string[] = [];

    if (projectEvidenceId) {
      const pe = await ProjectEvidence.findOne({ _id: projectEvidenceId, user: req.userId });
      if (!pe) {
        res.status(404).json({
          success: false,
          message: "Specified project evidence not found or unauthorized.",
        });
        return;
      }
      projectContextData = {
        projectTitle: pe.projectTitle,
        repositoryUrl: pe.repositoryUrl,
        findingsSummary: pe.summary.observedStrengths.join("; ") || `Verified repository code (${pe.repo})`,
        fileReference: pe.filesScanned[0]?.path,
        primaryTechnologies: pe.summary.primaryTechnologies,
      };
      projectVerifiedSkills = pe.claimAssessments
        .filter((c) => c.status === "supported" || c.status === "partially_supported")
        .map((c) => c.skill);
    }

    const isAdaptiveMode =
      Boolean(isAdaptive) ||
      difficulty === "Adaptive AI" ||
      (typeof mode === "string" && mode.toLowerCase().includes("adaptive"));

    const userSkills = [
      ...projectVerifiedSkills,
      ...(resume?.extractedSkills?.map((s) => s.name) || []),
      ...(resume?.parsedData?.skills || []),
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
    ];
    const userSummary = resume?.parsedData?.summary || "";
    const userProjects = resume?.parsedData?.projects || [];
    const userExperience = resume?.parsedData?.experience || [];

    // Parse Job Description requirements if supplied or from active roadmap
    const activeJdText = jobDescription || roadmap?.jobDescriptionSnippet || "";
    const parsedJd = activeJdText ? parseJobDescription(activeJdText) : null;

    const requiredSkills = parsedJd
      ? parsedJd.requirements.filter((r) => r.priority === "required").map((r) => r.name)
      : [];
    const preferredSkills = parsedJd
      ? parsedJd.requirements.filter((r) => r.priority === "preferred").map((r) => r.name)
      : [];
    const unspecifiedSkills = parsedJd
      ? parsedJd.requirements.filter((r) => r.priority === "unspecified").map((r) => r.name)
      : [];

    const effectiveRole = targetRole || roadmap?.jobTitle || "Full Stack Engineer";
    const effectiveCompany = targetCompany || "Tech Company";

    // Build Prioritized Topic Queue
    const prioritizedSkills = prioritizeInterviewTopics({
      targetRole: effectiveRole,
      jobRequiredSkills: requiredSkills,
      jobPreferredSkills: preferredSkills,
      jobUnspecifiedSkills: unspecifiedSkills,
      roadmapMissingSkills: roadmap?.targetMissingSkills || [],
      roadmapPrerequisites: roadmap?.unmetPrerequisites || [],
      resumeSkills: userSkills,
    });

    if (isAdaptiveMode) {
      // ADAPTIVE INTERVIEW ENGINE: Generate ONLY the first diagnostic question dynamically
      const initialSkill = prioritizedSkills[0] || "JavaScript";
      let startingDifficulty: InterviewDifficulty = "Medium";
      if (difficulty === "Easy" || difficulty === "Hard") {
        startingDifficulty = difficulty;
      }

      const firstQuestion = await generateAdaptiveQuestion({
        targetRole: effectiveRole,
        targetCompany: effectiveCompany,
        targetSkill: initialSkill,
        difficulty: startingDifficulty,
        isFollowup: false,
        questionIndex: 0,
        projectContext: projectContextData,
      });

      const session = await InterviewSession.create({
        user: req.userId,
        mode: mode || (projectContextData ? "Project-Grounded Technical Interview" : "Adaptive Technical Interview"),
        difficulty: difficulty || "Adaptive AI",
        length: length || 5,
        targetCompany: effectiveCompany,
        targetRole: effectiveRole,
        isAdaptive: true,
        jobDescription: activeJdText,
        projectEvidenceId: projectEvidenceId || undefined,
        projectContext: projectContextData,
        targetSkills: prioritizedSkills,
        unassessedSkills: prioritizedSkills.filter((s) => s !== initialSkill),
        assessedSkills: [],
        currentDifficulty: startingDifficulty,
        followupDepth: 0,
        maxFollowupDepth: 2,
        currentQuestionIndex: 0,
        nextAction: "next_skill",
        nextActionReason: projectContextData
          ? `Grounded initial question on repository evidence for ${projectContextData.projectTitle} (${initialSkill}).`
          : `Initial diagnostic question selected for highest-priority target skill: ${initialSkill}.`,
        questions: [firstQuestion],
        responses: [],
        overallScore: 0,
        status: "in_progress",
      });

      res.status(200).json({
        success: true,
        message: "Adaptive interview session started successfully",
        data: session,
      });
      return;
    }

    // LEGACY FIXED INTERVIEW: Generate full question batch upfront
    const prompt = `You are a Principal Technical Recruiter at ${effectiveCompany}. Generate a custom interview question set for a candidate applying for the role of ${effectiveRole}.

INTERVIEW SETUP:
- Mode: ${mode || "Mixed"}
- Difficulty: ${difficulty || "Medium"}
- Total Questions: ${length || 5}
- Target Company: ${effectiveCompany}
- Target Role: ${effectiveRole}

CANDIDATE RESUME PROFILE:
- Skills: ${JSON.stringify(userSkills)}
- Projects: ${JSON.stringify(userProjects.slice(0, 3))}
- Experience: ${JSON.stringify(userExperience.slice(0, 2))}
- Summary: "${userSummary}"
- Known Weaknesses: ${JSON.stringify(analysis?.weaknesses || [])}

Generate ${length || 5} highly specific, non-generic interview questions. For Resume-Based or Mixed mode, directly reference candidate's listed projects, tools, or experience.

Return ONLY a single valid JSON array of question objects without Markdown backticks:
[
  {
    "questionId": "q1",
    "text": "Question text...",
    "category": "System Design / Technical / HR",
    "difficulty": "Medium",
    "resumeReference": "Reference to candidate's project or skill if applicable"
  }
]`;

    let questions: any[] = [];
    const aiText = await generateWithFallback(prompt);

    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        questions = JSON.parse(cleaned);
      } catch (err) {
        console.error("Failed to parse Gemini interview questions JSON:", err);
      }
    }

    if (!questions || questions.length === 0) {
      questions = Array.from({ length: length || 5 }).map((_, idx) => ({
        questionId: `q${idx + 1}`,
        text:
          idx === 0 && userProjects.length > 0
            ? `You listed '${userProjects[0].title}' on your resume. Explain its architecture and key technical challenges.`
            : `Explain core concepts of ${userSkills[idx % userSkills.length] || "web development"} and how you optimize performance in production.`,
        category: mode || "Technical",
        difficulty: difficulty || "Medium",
        resumeReference: userProjects[0]?.title || "Resume Skills",
      }));
    }

    const session = await InterviewSession.create({
      user: req.userId,
      mode: mode || "Mixed",
      difficulty: difficulty || "Medium",
      length: length || questions.length,
      targetCompany: effectiveCompany,
      targetRole: effectiveRole,
      isAdaptive: false,
      questions,
      responses: [],
      overallScore: 0,
      status: "in_progress",
    });

    res.status(200).json({
      success: true,
      message: "Interview session started successfully",
      data: session,
    });
  } catch (error) {
    console.error("Error starting interview session:", error);
    res.status(500).json({
      success: false,
      message: "Server error starting interview session",
    });
  }
};

/**
 * Submits an answer to a question and computes evaluation.
 * In Adaptive mode, dynamically evaluates performance and selects/generates the next question.
 */
export const submitQuestionAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, questionId, questionText, userAnswer } = req.body;

    if (!sessionId || !questionId || userAnswer === undefined) {
      res.status(400).json({
        success: false,
        message: "Please provide sessionId, questionId, and userAnswer",
      });
      return;
    }

    const session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });
    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found or unauthorized" });
      return;
    }

    if (session.status === "completed") {
      res.status(400).json({
        success: false,
        message: "Interview session is already completed",
      });
      return;
    }

    // Duplicate submission prevention: check if this questionId was already answered
    const alreadyAnswered = session.responses.some((r) => r.questionId === questionId);
    if (alreadyAnswered) {
      res.status(400).json({
        success: false,
        message: "An answer for this question has already been submitted.",
      });
      return;
    }

    // Find the question being answered
    const currentQ = session.questions.find((q) => q.questionId === questionId) || {
      questionId,
      text: questionText,
      category: session.mode,
      skill: session.targetSkills?.[0] || "General Engineering",
      difficulty: session.currentDifficulty || "Medium",
    };

    const targetSkill = currentQ.skill || session.targetSkills?.[0] || "General Engineering";
    const currentDiff = (currentQ.difficulty as InterviewDifficulty) || (session.currentDifficulty as InterviewDifficulty) || "Medium";

    // 1. Evaluate candidate answer against 5-dimension rubric with question-grounded RAG
    const evaluation = await evaluateAnswerWithRubric({
      questionId: currentQ.questionId,
      questionText: currentQ.text,
      userAnswer,
      skill: targetSkill,
      difficulty: currentDiff,
      targetRole: session.targetRole,
      targetCompany: session.targetCompany,
      projectContext: session.projectContext,
    });

    const responseEntry: IInterviewResponse = {
      questionId,
      questionText: currentQ.text,
      category: currentQ.category || session.mode,
      skill: targetSkill,
      userAnswer,
      accuracy: evaluation.rubric.accuracy,
      communication: evaluation.rubric.communication,
      technicalCorrectness: evaluation.rubric.technicalCorrectness,
      depth: evaluation.rubric.depth,
      confidence: Math.round((evaluation.rubric.communication + evaluation.rubric.technicalCorrectness) / 2),
      practicalApplication: evaluation.rubric.practicalApplication,
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      suggestedImprovement: evaluation.suggestedImprovement,
      betterAnswer: evaluation.betterAnswer,
      followupQuestion: evaluation.betterAnswer ? `Explore: ${evaluation.suggestedImprovement}` : "",
      difficultyRating: currentDiff,
      recommendedAction: evaluation.recommendedAction,
      score: evaluation.rubric.overallScore,
      evaluatedAt: new Date(),
    };

    session.responses.push(responseEntry);

    // Update assessed skills aggregation
    const skillScoresMap = new Map<string, { totalScore: number; count: number }>();
    session.responses.forEach((r) => {
      const sName = r.skill ? normalizeSkillName(r.skill) : "General Engineering";
      const existing = skillScoresMap.get(sName) || { totalScore: 0, count: 0 };
      skillScoresMap.set(sName, {
        totalScore: existing.totalScore + r.score,
        count: existing.count + 1,
      });
    });

    const assessedSummaries: IAssessedSkillSummary[] = Array.from(skillScoresMap.entries()).map(([skill, data]) => {
      const avg = Math.round(data.totalScore / data.count);
      return {
        skill,
        score: avg,
        questionsCount: data.count,
        status: avg >= 80 ? "strong" : avg >= 60 ? "competent" : "weak",
      };
    });
    session.assessedSkills = assessedSummaries;

    // 2. ADAPTIVE LOGIC: Determine next step or finish
    if (session.isAdaptive) {
      const decision = determineNextAdaptiveAction({
        lastEvaluationScore: evaluation.rubric.overallScore,
        lastSkill: targetSkill,
        currentDifficulty: currentDiff,
        followupDepth: session.followupDepth || 0,
        maxFollowupDepth: session.maxFollowupDepth || 2,
        currentQuestionCount: session.responses.length,
        maxQuestions: session.length,
        assessedSkills: session.assessedSkills || [],
        unassessedSkills: session.unassessedSkills || [],
      });

      session.nextAction = decision.nextAction;
      session.nextActionReason = decision.reason;

      // Check if session stopping conditions met
      if (decision.nextAction === "finish" || session.responses.length >= session.length) {
        // Fetch past sessions for historical comparison
        const pastSessions = await InterviewSession.find({
          user: req.userId,
          status: "completed",
          _id: { $ne: session._id },
        })
          .sort({ createdAt: -1 })
          .limit(10);

        const report: IInterviewReport = synthesizeAdaptiveInterviewReport({
          targetRole: session.targetRole,
          targetCompany: session.targetCompany,
          allTargetSkills: session.targetSkills || [targetSkill],
          responses: session.responses,
          historicalSessions: pastSessions,
        });

        session.overallScore = report.overallScore;
        session.status = "completed";
        session.report = report;
        await session.save();

        res.status(200).json({
          success: true,
          message: "Interview finished and final report generated",
          data: {
            sessionId: session._id,
            evaluation: responseEntry,
            isFinished: true,
            report,
            session,
          },
        });
        return;
      }

      // Generate the Next Adaptive Question
      const isNextFollowup = decision.nextAction === "follow_up";
      const nextQ = await generateAdaptiveQuestion({
        targetRole: session.targetRole,
        targetCompany: session.targetCompany,
        targetSkill: decision.targetSkill,
        difficulty: decision.nextDifficulty,
        isFollowup: isNextFollowup,
        parentQuestionText: currentQ.text,
        parentAnswerText: userAnswer,
        identifiedGaps: evaluation.gaps,
        followupReason: decision.reason,
        questionIndex: session.questions.length,
        projectContext: session.projectContext,
      });

      session.questions.push(nextQ);
      session.currentDifficulty = decision.nextDifficulty;
      session.followupDepth = decision.followupDepth;
      session.currentQuestionIndex = session.questions.length - 1;

      // Update remaining unassessed skills
      if (!isNextFollowup) {
        session.unassessedSkills = (session.unassessedSkills || []).filter(
          (s) => s.toLowerCase() !== decision.targetSkill.toLowerCase()
        );
      }

      await session.save();

      res.status(200).json({
        success: true,
        message: "Answer evaluated and next adaptive question generated",
        data: {
          sessionId: session._id,
          evaluation: responseEntry,
          nextQuestion: nextQ,
          isFinished: false,
          session,
        },
      });
      return;
    }

    // Non-adaptive fixed mock interview: check if all questions are now answered
    if (session.responses.length >= session.questions.length) {
      const pastSessions = await InterviewSession.find({
        user: req.userId,
        status: "completed",
        _id: { $ne: session._id },
      })
        .sort({ createdAt: -1 })
        .limit(10);

      const report: IInterviewReport = synthesizeAdaptiveInterviewReport({
        targetRole: session.targetRole,
        targetCompany: session.targetCompany,
        allTargetSkills: session.targetSkills && session.targetSkills.length > 0
          ? session.targetSkills
          : session.questions.map((q) => q.skill || q.category).filter(Boolean),
        responses: session.responses,
        historicalSessions: pastSessions,
      });

      session.overallScore = report.overallScore;
      session.status = "completed";
      session.report = report;
      await session.save();

      res.status(200).json({
        success: true,
        message: "Interview finished and final report generated",
        data: {
          sessionId: session._id,
          evaluation: responseEntry,
          isFinished: true,
          report,
          session,
        },
      });
      return;
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Answer evaluated successfully",
      data: {
        sessionId: session._id,
        evaluation: responseEntry,
        isFinished: false,
        session,
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({
      success: false,
      message: "Server error evaluating answer",
    });
  }
};

/**
 * Concludes an interview session and compiles final report.
 */
export const finishInterviewSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });

    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found or unauthorized" });
      return;
    }

    if (session.status === "completed" && session.report) {
      res.status(200).json({
        success: true,
        message: "Interview session was already completed",
        data: session,
      });
      return;
    }

    // Historical sessions comparison
    const pastSessions = await InterviewSession.find({
      user: req.userId,
      status: "completed",
      _id: { $ne: session._id },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const report: IInterviewReport = synthesizeAdaptiveInterviewReport({
      targetRole: session.targetRole,
      targetCompany: session.targetCompany,
      allTargetSkills: session.targetSkills && session.targetSkills.length > 0
        ? session.targetSkills
        : session.questions.map((q) => q.skill || q.category).filter(Boolean),
      responses: session.responses,
      historicalSessions: pastSessions,
    });

    session.overallScore = report.overallScore;
    session.status = "completed";
    session.report = report;

    await session.save();

    res.status(200).json({
      success: true,
      message: "Interview session completed successfully",
      data: session,
    });
  } catch (error) {
    console.error("Error finishing interview session:", error);
    res.status(500).json({
      success: false,
      message: "Server error finishing interview session",
    });
  }
};

/**
 * Retrieves a specific interview session by ID (enables recovery on page refresh).
 */
export const getInterviewSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await InterviewSession.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error retrieving interview session:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving interview session",
    });
  }
};

/**
 * Retrieves latest active interview session for user if any.
 */
export const getActiveInterviewSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeSession = await InterviewSession.findOne({
      user: req.userId,
      status: "in_progress",
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: activeSession || null,
    });
  } catch (error) {
    console.error("Error retrieving active interview session:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving active session",
    });
  }
};

/**
 * Retrieves aggregate interview statistics across sessions.
 */
export const getInterviewHistoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await InterviewSession.find({ user: req.userId }).sort({ createdAt: -1 });

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const mockInterviewsCompleted = completedSessions.length;
    const allResponses = sessions.flatMap((s) => s.responses);
    const questionsSolved = allResponses.length;

    const totalScoreSum = completedSessions.reduce((sum, s) => sum + s.overallScore, 0);
    const averageScore = mockInterviewsCompleted > 0 ? Math.round(totalScoreSum / mockInterviewsCompleted) : 0;

    // Collect weakest and strongest topics from assessed skills
    const skillScoreAgg = new Map<string, { total: number; count: number }>();
    allResponses.forEach((r) => {
      const s = r.skill ? normalizeSkillName(r.skill) : r.category || "General";
      const cur = skillScoreAgg.get(s) || { total: 0, count: 0 };
      skillScoreAgg.set(s, { total: cur.total + r.score, count: cur.count + 1 });
    });

    let weakestTopic = "System Architecture & Scalability";
    let strongestTopic = "Frontend Frameworks & REST APIs";
    let minAvg = Infinity;
    let maxAvg = -Infinity;

    skillScoreAgg.forEach((val, skill) => {
      const avg = val.total / val.count;
      if (avg < minAvg) {
        minAvg = avg;
        weakestTopic = skill;
      }
      if (avg > maxAvg) {
        maxAvg = avg;
        strongestTopic = skill;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        questionsSolved,
        mockInterviewsCompleted,
        averageInterviewScore: averageScore,
        confidenceLevel: averageScore >= 80 ? "High" : averageScore >= 60 ? "Moderate" : "Building",
        weakestTopic,
        strongestTopic,
        recentSessions: sessions.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error fetching interview stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching interview stats",
    });
  }
};
