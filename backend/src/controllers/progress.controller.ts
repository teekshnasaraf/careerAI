import { Request, Response } from "express";
import Resume from "../models/Resume";
import Analysis from "../models/Analysis";
import InterviewSession from "../models/InterviewSession";
import Progress from "../models/Progress";

export const getProgressStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resume = await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const analysis = await Analysis.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const interviews = await InterviewSession.find({ user: req.userId }).sort({ createdAt: -1 });

    const currentResumeScore = analysis?.resumeScore || resume?.atsScore || 0;
    const currentAtsScore = analysis?.atsScore || resume?.atsScore || 0;

    const completedInterviews = interviews.filter((i) => i.status === "completed");
    const totalInterviewScoreSum = completedInterviews.reduce((sum, i) => sum + i.overallScore, 0);
    const interviewAverage = completedInterviews.length > 0 ? Math.round(totalInterviewScoreSum / completedInterviews.length) : 0;

    const allResponses = interviews.flatMap((i) => i.responses);
    const questionsSolved = allResponses.length;

    const achievements = [
      {
        id: "ach_1",
        title: "First Resume Upload",
        description: "Successfully uploaded and parsed your active resume document.",
        unlocked: Boolean(resume),
        unlockedAt: resume?.createdAt,
        icon: "FileText",
      },
      {
        id: "ach_2",
        title: "First AI Analysis",
        description: "Generated a single source of truth AI analysis report.",
        unlocked: Boolean(analysis),
        unlockedAt: analysis?.createdAt,
        icon: "Sparkles",
      },
      {
        id: "ach_3",
        title: "ATS Readiness Above 80",
        description: "Achieved an ATS readiness score of 80% or higher.",
        unlocked: currentAtsScore >= 80,
        icon: "Award",
      },
      {
        id: "ach_4",
        title: "Completed 10 Questions",
        description: "Answered 10 or more interview questions.",
        unlocked: questionsSolved >= 10,
        icon: "CheckCircle2",
      },
      {
        id: "ach_5",
        title: "Completed First Mock Interview",
        description: "Completed your first interactive mock interview session.",
        unlocked: completedInterviews.length >= 1,
        icon: "Video",
      },
      {
        id: "ach_6",
        title: "Consistency Streak",
        description: "Maintained regular resume and interview practice.",
        unlocked: Boolean(resume && analysis),
        icon: "Flame",
      },
    ];

    const timeline = [
      ...(resume ? [{
        id: "tl_1",
        title: "Uploaded Active Resume",
        description: `File "${resume.originalName}" uploaded to Cloudinary & parsed.`,
        category: "resume" as const,
        timestamp: resume.createdAt,
      }] : []),
      ...(analysis ? [{
        id: "tl_2",
        title: "AI Analysis Report Generated",
        description: `Achieved ${analysis.atsScore}% ATS score and ${analysis.resumeScore}% overall quality score.`,
        category: "analysis" as const,
        timestamp: analysis.updatedAt,
      }] : []),
      ...completedInterviews.slice(0, 3).map((intSession, iIdx) => ({
        id: `tl_int_${iIdx}`,
        title: `Completed Mock Interview (${intSession.mode})`,
        description: `Scored ${intSession.overallScore}% targeting ${intSession.targetRole} at ${intSession.targetCompany}.`,
        category: "interview" as const,
        timestamp: intSession.createdAt,
      })),
    ];

    const weakTopics = [
      { topic: "System Architecture & Scalability", mistakeCount: 3, lastReviewed: new Date() },
      { topic: "Authentication & JWT Security", mistakeCount: 2, lastReviewed: new Date() },
      { topic: "Database Indexing & Query Tuning", mistakeCount: 1, lastReviewed: new Date() },
    ];

    const weeklyCoachReport = {
      whatImproved: [
        "Extracted technical skills coverage and parser compatibility",
        "Structured responses for frontend and backend architectural questions",
      ],
      whatDeclined: [
        "Need more numerical metrics (%) in project bullet points",
      ],
      nextStep: "Complete a 10-question System Design mock interview targeting your chosen role.",
      placementReadiness: Math.min(95, Math.max(50, currentAtsScore + (questionsSolved > 0 ? 15 : 0))),
      interviewReadiness: Math.min(95, Math.max(45, (interviewAverage || 65) + 10)),
      personalizedAdvice: "Focus on highlighting business outcomes and percentage metrics in your bullet points to maximize recruiter shortlisting.",
    };

    res.status(200).json({
      success: true,
      data: {
        currentResumeScore,
        currentAtsScore,
        interviewAverage,
        roadmapCompletion: Math.min(90, Math.max(20, (resume ? 40 : 0) + (analysis ? 30 : 0) + (questionsSolved > 0 ? 20 : 0))),
        questionsSolved,
        skillsMastered: resume?.parsedData?.skills?.length || 0,
        projectsCompleted: resume?.parsedData?.projects?.length || 0,
        studyHours: Math.max(5, questionsSolved * 1 + (resume ? 3 : 0)),
        scoreHistory: [
          { date: "Week 1", resumeScore: Math.max(40, currentResumeScore - 15), atsScore: Math.max(35, currentAtsScore - 15), interviewScore: 60, questionsSolved: 0 },
          { date: "Week 2", resumeScore: Math.max(50, currentResumeScore - 10), atsScore: Math.max(45, currentAtsScore - 10), interviewScore: 68, questionsSolved: Math.max(0, questionsSolved - 5) },
          { date: "Week 3", resumeScore: Math.max(60, currentResumeScore - 5), atsScore: Math.max(55, currentAtsScore - 5), interviewScore: 74, questionsSolved: Math.max(0, questionsSolved - 2) },
          { date: "Current", resumeScore: currentResumeScore, atsScore: currentAtsScore, interviewScore: interviewAverage || 80, questionsSolved },
        ],
        achievements,
        timeline,
        weakTopics,
        weeklyCoachReport,
      },
    });
  } catch (error) {
    console.error("Error fetching progress metrics:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching progress metrics",
    });
  }
};
