import { Request, Response } from "express";
import Resume from "../models/Resume";
import Analysis from "../models/Analysis";
import {
  generateResumeAnalysis,
  improveResumeSection,
  generateSkillGapAnalysis,
} from "../services/ai.service";

export const getLatestAnalysis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const analysis = await Analysis.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    if (!analysis) {
      // Check if user has uploaded a resume to analyze automatically
      const resume = await Resume.findOne({ user: req.userId }).sort({
        updatedAt: -1,
      });

      if (!resume) {
        res.status(200).json({
          success: true,
          message: "No resume found. Upload a resume first to generate analysis.",
          data: null,
        });
        return;
      }

      // Generate initial analysis
      const aiResult = await generateResumeAnalysis(
        resume.parsedData?.summary || resume.originalName,
        resume.parsedData
      );

      const newAnalysis = await Analysis.create({
        user: req.userId,
        resumeId: resume._id,
        resumeScore: aiResult.resumeScore,
        atsScore: aiResult.atsScore,
        sectionAnalysis: aiResult.sectionAnalysis,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        suggestions: aiResult.suggestions,
        missingSkills: aiResult.missingSkills,
        targetRole: "Full Stack Engineer",
      });

      res.status(200).json({
        success: true,
        data: newAnalysis,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching analysis",
    });
  }
};

export const runResumeAnalysis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resume = await Resume.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    if (!resume) {
      res.status(400).json({
        success: false,
        message: "No resume uploaded. Please upload a resume first.",
      });
      return;
    }

    // Call AI Service
    const aiResult = await generateResumeAnalysis(
      resume.parsedData?.summary || resume.originalName,
      resume.parsedData
    );

    // Overwrite or create Analysis record
    const existingAnalysis = await Analysis.findOne({ user: req.userId });

    let analysis;

    if (existingAnalysis) {
      existingAnalysis.resumeId = resume._id as any;
      existingAnalysis.resumeScore = aiResult.resumeScore;
      existingAnalysis.atsScore = aiResult.atsScore;
      existingAnalysis.sectionAnalysis = aiResult.sectionAnalysis;
      existingAnalysis.strengths = aiResult.strengths;
      existingAnalysis.weaknesses = aiResult.weaknesses;
      existingAnalysis.suggestions = aiResult.suggestions;
      existingAnalysis.missingSkills = aiResult.missingSkills;

      analysis = await existingAnalysis.save();
    } else {
      analysis = await Analysis.create({
        user: req.userId,
        resumeId: resume._id,
        resumeScore: aiResult.resumeScore,
        atsScore: aiResult.atsScore,
        sectionAnalysis: aiResult.sectionAnalysis,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        suggestions: aiResult.suggestions,
        missingSkills: aiResult.missingSkills,
        targetRole: "Full Stack Engineer",
      });
    }

    res.status(200).json({
      success: true,
      message: "AI Resume Analysis completed successfully",
      data: analysis,
    });
  } catch (error) {
    console.error("Error running AI resume analysis:", error);
    res.status(500).json({
      success: false,
      message: "Server error running resume analysis",
    });
  }
};

export const improveSection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sectionType, content } = req.body;

    if (!sectionType || !content) {
      res.status(400).json({
        success: false,
        message: "Please provide sectionType and content to improve",
      });
      return;
    }

    const result = await improveResumeSection(sectionType, content);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error improving section:", error);
    res.status(500).json({
      success: false,
      message: "Server error improving section",
    });
  }
};

export const runSkillGapAnalysis = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { targetRole } = req.body;

    if (!targetRole) {
      res.status(400).json({
        success: false,
        message: "Please specify a target job role for skill gap comparison",
      });
      return;
    }

    const resume = await Resume.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    const userSkills = resume?.parsedData?.skills || ["React", "JavaScript", "TypeScript", "Node.js"];

    const skillGap = await generateSkillGapAnalysis(userSkills, targetRole);

    // Update existing Analysis record if available
    await Analysis.findOneAndUpdate(
      { user: req.userId },
      { targetRole, skillGapAnalysis: skillGap },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: skillGap,
    });
  } catch (error) {
    console.error("Error running skill gap analysis:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating skill gap analysis",
    });
  }
};
