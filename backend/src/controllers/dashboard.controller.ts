import { Request, Response } from "express";
import Resume from "../models/Resume";
import Analysis from "../models/Analysis";

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resume = await Resume.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });
    const analysis = await Analysis.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    const resumeUploaded = Boolean(resume);
    const resumeScore = analysis?.resumeScore || resume?.atsScore || 0;
    const atsScore = analysis?.atsScore || resume?.atsScore || 0;
    const interviewCount = 0; // Mock interview count metric
    const questionsPracticed = 0; // Questions practiced metric
    const lastResumeUpload = resume?.createdAt ? resume.createdAt.toISOString() : null;
    const lastAnalysisDate = analysis?.updatedAt ? analysis.updatedAt.toISOString() : null;
    const targetRole = analysis?.targetRole || "Full Stack Engineer";
    const skillGapCount = analysis?.skillGapAnalysis?.missingSkills?.length || analysis?.missingSkills?.length || 0;

    res.status(200).json({
      success: true,
      data: {
        resumeUploaded,
        resumeScore,
        atsScore,
        interviewCount,
        questionsPracticed,
        lastResumeUpload,
        lastAnalysisDate,
        targetRole,
        skillGapCount,
        originalName: resume?.originalName || null,
        fileUrl: resume?.fileUrl || null,
        publicId: resume?.publicId || null,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard metrics",
    });
  }
};
