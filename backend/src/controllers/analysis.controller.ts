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
    const resume = await Resume.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    if (!resume) {
      res.status(200).json({
        success: true,
        message: "No resume found. Please upload a resume first.",
        data: null,
      });
      return;
    }

    let analysis = await Analysis.findOne({ user: req.userId }).sort({
      updatedAt: -1,
    });

    if (!analysis) {
      const fullText = resume.rawText || [
        resume.parsedData?.summary,
        ...(resume.parsedData?.skills || []),
        ...(resume.parsedData?.experience || []).map((e) => `${e.title} ${e.company} ${e.bulletPoints?.join(" ")}`),
        ...(resume.parsedData?.education || []).map((e) => `${e.degree} ${e.institution}`),
        ...(resume.parsedData?.projects || []).map((p) => `${p.title} ${p.description}`),
      ].filter(Boolean).join("\n");

      const aiResult = await generateResumeAnalysis(
        fullText || resume.originalName,
        resume.parsedData
      );

      analysis = await Analysis.create({
        user: req.userId,
        resumeId: resume._id,
        resumeScore: aiResult.resumeScore,
        atsScore: aiResult.atsScore,
        sectionScores: aiResult.sectionScores,
        sectionAnalysis: aiResult.sectionAnalysis,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        suggestions: aiResult.suggestions,
        missingSkills: aiResult.missingSkills,
        recommendedKeywords: aiResult.recommendedKeywords,
        actionVerbs: aiResult.actionVerbs,
        formattingSuggestions: aiResult.formattingSuggestions,
        topPriorityImprovements: aiResult.topPriorityImprovements,
        targetRole: "Full Stack Engineer",
      });

      resume.atsScore = aiResult.atsScore;
      await resume.save();
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

    const fullText = resume.rawText || [
      resume.parsedData?.summary,
      ...(resume.parsedData?.skills || []),
      ...(resume.parsedData?.experience || []).map((e) => `${e.title} ${e.company} ${e.bulletPoints?.join(" ")}`),
      ...(resume.parsedData?.education || []).map((e) => `${e.degree} ${e.institution}`),
      ...(resume.parsedData?.projects || []).map((p) => `${p.title} ${p.description}`),
    ].filter(Boolean).join("\n");

    const aiResult = await generateResumeAnalysis(
      fullText || resume.originalName,
      resume.parsedData
    );

    const existingAnalysis = await Analysis.findOne({ user: req.userId });

    let analysis;
    if (existingAnalysis) {
      existingAnalysis.resumeId = resume._id as any;
      existingAnalysis.resumeScore = aiResult.resumeScore;
      existingAnalysis.atsScore = aiResult.atsScore;
      existingAnalysis.sectionScores = aiResult.sectionScores;
      existingAnalysis.sectionAnalysis = aiResult.sectionAnalysis;
      existingAnalysis.strengths = aiResult.strengths;
      existingAnalysis.weaknesses = aiResult.weaknesses;
      existingAnalysis.suggestions = aiResult.suggestions;
      existingAnalysis.missingSkills = aiResult.missingSkills;
      existingAnalysis.recommendedKeywords = aiResult.recommendedKeywords;
      existingAnalysis.actionVerbs = aiResult.actionVerbs;
      existingAnalysis.formattingSuggestions = aiResult.formattingSuggestions;
      existingAnalysis.topPriorityImprovements = aiResult.topPriorityImprovements;

      analysis = await existingAnalysis.save();
    } else {
      analysis = await Analysis.create({
        user: req.userId,
        resumeId: resume._id,
        resumeScore: aiResult.resumeScore,
        atsScore: aiResult.atsScore,
        sectionScores: aiResult.sectionScores,
        sectionAnalysis: aiResult.sectionAnalysis,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        suggestions: aiResult.suggestions,
        missingSkills: aiResult.missingSkills,
        recommendedKeywords: aiResult.recommendedKeywords,
        actionVerbs: aiResult.actionVerbs,
        formattingSuggestions: aiResult.formattingSuggestions,
        topPriorityImprovements: aiResult.topPriorityImprovements,
        targetRole: "Full Stack Engineer",
      });
    }

    // Synchronize ATS Score on Resume document as well
    resume.atsScore = aiResult.atsScore;
    await resume.save();

    res.status(200).json({
      success: true,
      message: "AI Resume Analysis updated successfully",
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

    const resume = await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    const analysis = await Analysis.findOne({ user: req.userId });

    const result = await improveResumeSection(
      sectionType,
      content,
      resume?.parsedData?.summary || "",
      analysis?.targetRole || "Software Engineer",
      analysis?.weaknesses || []
    );

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

    const userSkills = resume?.parsedData?.skills || [];
    const resumeContext = resume?.parsedData?.summary || resume?.originalName || "";

    const skillGap = await generateSkillGapAnalysis(userSkills, targetRole, resumeContext);

    const updatedAnalysis = await Analysis.findOneAndUpdate(
      { user: req.userId },
      { targetRole, skillGapAnalysis: skillGap },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: updatedAnalysis,
    });
  } catch (error) {
    console.error("Error running skill gap analysis:", error);
    res.status(500).json({
      success: false,
      message: "Server error generating skill gap analysis",
    });
  }
};
