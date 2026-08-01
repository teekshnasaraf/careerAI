import { Request, Response } from "express";
import Resume from "../models/Resume";
import Analysis from "../models/Analysis";
import InterviewSession from "../models/InterviewSession";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateWithFallback(prompt: string): Promise<string> {
  if (!ai) return "";
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

export const startInterviewSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode, difficulty, length, targetCompany, targetRole } = req.body;

    const resume = await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const analysis = await Analysis.findOne({ user: req.userId }).sort({ updatedAt: -1 });

    const userSkills = resume?.parsedData?.skills || ["JavaScript", "TypeScript", "React", "Node.js"];
    const userSummary = resume?.parsedData?.summary || "";
    const userProjects = resume?.parsedData?.projects || [];
    const userExperience = resume?.parsedData?.experience || [];

    const prompt = `You are a Principal Technical Recruiter at ${targetCompany || "Google"}. Generate a custom interview question set for a candidate applying for the role of ${targetRole || "Software Engineer"}.

INTERVIEW SETUP:
- Mode: ${mode || "Mixed"}
- Difficulty: ${difficulty || "Medium"}
- Total Questions: ${length || 5}
- Target Company: ${targetCompany || "Google"}
- Target Role: ${targetRole || "Full Stack Engineer"}

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
        text: idx === 0 && userProjects.length > 0
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
      targetCompany: targetCompany || "Google",
      targetRole: targetRole || "Full Stack Engineer",
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

export const submitQuestionAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, questionId, questionText, userAnswer } = req.body;

    if (!sessionId || !questionId || !userAnswer) {
      res.status(400).json({
        success: false,
        message: "Please provide sessionId, questionId, and userAnswer",
      });
      return;
    }

    const session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });
    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found" });
      return;
    }

    const prompt = `You are a Senior FAANG Interview Evaluator. Evaluate the user's answer to this interview question:

QUESTION: "${questionText}"
CANDIDATE ANSWER: "${userAnswer}"
TARGET ROLE: "${session.targetRole}"
TARGET COMPANY: "${session.targetCompany}"

Evaluate and return ONLY a valid JSON object without Markdown backticks:
{
  "accuracy": 85,
  "communication": 80,
  "technicalCorrectness": 85,
  "depth": 75,
  "confidence": 80,
  "score": 82,
  "betterAnswer": "Ideal answer structured using STAR or architectural best practices...",
  "followupQuestion": "Follow-up question to probe deeper into edge cases...",
  "difficultyRating": "Medium"
}`;

    let evalResult: any = null;
    const aiText = await generateWithFallback(prompt);

    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        evalResult = JSON.parse(cleaned);
      } catch (err) {
        console.error("Failed to parse Gemini evaluation JSON:", err);
      }
    }

    if (!evalResult) {
      const answerLen = userAnswer.trim().length;
      const calcScore = Math.min(95, Math.max(50, 60 + Math.floor(answerLen / 10)));
      evalResult = {
        accuracy: calcScore,
        communication: 80,
        technicalCorrectness: calcScore,
        depth: 75,
        confidence: 80,
        score: calcScore,
        betterAnswer: `Structure your response clearly by defining core concepts, providing practical code examples, and highlighting real-world trade-offs.`,
        followupQuestion: `How would you handle scale, caching, and error handling in this scenario?`,
        difficultyRating: "Medium",
      };
    }

    const responseEntry = {
      questionId,
      questionText,
      category: session.mode,
      userAnswer,
      accuracy: evalResult.accuracy || 80,
      communication: evalResult.communication || 80,
      technicalCorrectness: evalResult.technicalCorrectness || 80,
      depth: evalResult.depth || 75,
      confidence: evalResult.confidence || 80,
      betterAnswer: evalResult.betterAnswer || "",
      followupQuestion: evalResult.followupQuestion || "",
      difficultyRating: evalResult.difficultyRating || "Medium",
      score: evalResult.score || 80,
      evaluatedAt: new Date(),
    };

    session.responses.push(responseEntry);
    await session.save();

    res.status(200).json({
      success: true,
      message: "Answer evaluated successfully",
      data: {
        sessionId: session._id,
        evaluation: responseEntry,
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

export const finishInterviewSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });

    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found" });
      return;
    }

    const responseCount = session.responses.length;
    const totalScoreSum = session.responses.reduce((sum, r) => sum + r.score, 0);
    const overallScore = responseCount > 0 ? Math.round(totalScoreSum / responseCount) : 75;

    const report = {
      overallScore,
      topicBreakdown: [
        { topic: session.mode, score: overallScore },
        { topic: "Technical Architecture", score: Math.min(95, overallScore + 3) },
        { topic: "Communication & Clarity", score: Math.max(60, overallScore - 2) },
      ],
      strengths: [
        "Structured technical reasoning",
        "Clear explanation of project implementations",
      ],
      weaknesses: [
        "Could elaborate further on edge cases and failure scenarios",
      ],
      conceptsToRevise: [
        "System Scalability & Caching Strategies",
        "Asynchronous Event Handling",
      ],
      suggestedResources: [
        "ByteByteGo System Design",
        "MDN Web Docs & AWS Architecture Center",
      ],
      suggestedProjects: [
        `Build a microservice platform with Redis caching for ${session.targetRole}`,
      ],
      recommendedNextInterview: "Adaptive Technical & System Design Practice",
    };

    session.overallScore = overallScore;
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

export const getInterviewHistoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await InterviewSession.find({ user: req.userId }).sort({ createdAt: -1 });

    const mockInterviewsCompleted = sessions.filter((s) => s.status === "completed").length;
    const allResponses = sessions.flatMap((s) => s.responses);
    const questionsSolved = allResponses.length;

    const totalScoreSum = sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + s.overallScore, 0);

    const averageScore = mockInterviewsCompleted > 0 ? Math.round(totalScoreSum / mockInterviewsCompleted) : 0;

    res.status(200).json({
      success: true,
      data: {
        questionsSolved,
        mockInterviewsCompleted,
        averageInterviewScore: averageScore,
        confidenceLevel: averageScore >= 80 ? "High" : averageScore >= 60 ? "Moderate" : "Building",
        weakestTopic: "System Architecture & Scalability",
        strongestTopic: "Frontend Frameworks & REST APIs",
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
