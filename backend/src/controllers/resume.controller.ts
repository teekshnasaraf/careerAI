import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Resume from "../models/Resume";
import User from "../models/User";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { buildResumeAnalysisPayload, extractTextFromFile, parseResumeText } from "../services/resumeParser.service";
import { generateResumeAnalysis } from "../services/ai.service";

export const uploadResume = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please select a resume file to upload",
      });
      return;
    }

    const { originalname, filename, size, mimetype, path: tempFilePath } = req.file;

    // 1. Extract raw text & parse sections from document BEFORE cloud upload deletes temp file
    let parsedResult: any = {
      summary: "",
      skills: [],
      experience: [],
      education: [],
      projects: [],
      sectionChecklist: [],
      atsBreakdown: {
        sectionStructureScore: 0,
        skillsCoverageScore: 0,
        readabilityScore: 0,
        impactMetricsScore: 0,
      },
      aiFeedback: [],
      atsScore: 0,
    };

    let extractedText = "";
    try {
      extractedText = await extractTextFromFile(tempFilePath, mimetype);
      if (extractedText && extractedText.trim().length > 5) {
        parsedResult = parseResumeText(extractedText);
      }
    } catch (parseErr) {
      console.error("Resume parsing error:", parseErr);
    }

    // 2. Upload file to Cloudinary & remove temporary file
    const cloudinaryResult = await uploadToCloudinary(tempFilePath);
    const { fileUrl, publicId } = cloudinaryResult;

    // 3. Check if user already has an existing resume (replace existing instead of creating duplicates)
    const existingResume = await Resume.findOne({ user: req.userId });

    let resume;
    const aiResult = await generateResumeAnalysis(
      extractedText || JSON.stringify(parsedResult),
      parsedResult
    );

    if (existingResume) {
      // Clean up previous Cloudinary asset / local file
      if (existingResume.publicId) {
        await deleteFromCloudinary(existingResume.publicId);
      } else if (existingResume.fileName) {
        const oldFilePath = path.join(process.cwd(), "uploads", "resumes", existingResume.fileName);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.error("Error deleting old file:", e);
          }
        }
      }

      // Overwrite existing resume with parsed data & Gemini ATS Score
      existingResume.originalName = originalname;
      existingResume.fileName = filename;
      existingResume.fileUrl = fileUrl;
      existingResume.publicId = publicId;
      existingResume.fileSize = size;
      existingResume.mimeType = mimetype;
      existingResume.rawText = extractedText;
      existingResume.status = "parsed";
      existingResume.atsScore = aiResult.atsScore;
      existingResume.parsedData = {
        summary: parsedResult.summary,
        skills: parsedResult.skills,
        experience: parsedResult.experience,
        education: parsedResult.education,
        projects: parsedResult.projects,
      };
      existingResume.sectionChecklist = parsedResult.sectionChecklist;
      existingResume.atsBreakdown = parsedResult.atsBreakdown;
      existingResume.aiFeedback = parsedResult.aiFeedback;

      resume = await existingResume.save();
    } else {
      // Create new resume record
      resume = await Resume.create({
        user: req.userId,
        originalName: originalname,
        fileName: filename,
        fileUrl: fileUrl,
        publicId: publicId,
        fileSize: size,
        mimeType: mimetype,
        rawText: extractedText,
        status: "parsed",
        atsScore: aiResult.atsScore,
        parsedData: {
          summary: parsedResult.summary,
          skills: parsedResult.skills,
          experience: parsedResult.experience,
          education: parsedResult.education,
          projects: parsedResult.projects,
        },
        sectionChecklist: parsedResult.sectionChecklist,
        atsBreakdown: parsedResult.atsBreakdown,
        aiFeedback: parsedResult.aiFeedback,
      });
    }

    // Sync Analysis document single source of truth with Gemini AI result
    const Analysis = require("../models/Analysis").default;

    await Analysis.findOneAndUpdate(
      { user: req.userId },
      {
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
      },
      { upsert: true, new: true }
    );

    // Update user profile resumeUrl
    await User.findByIdAndUpdate(req.userId, {
      resumeUrl: fileUrl,
    });

    res.status(200).json({
      success: true,
      message: "Resume uploaded and parsed successfully",
      data: resume,
    });
  } catch (error) {
    console.error("Error uploading resume:", error);
    res.status(500).json({
      success: false,
      message: "Server error uploading resume",
    });
  }
};

export const getLatestResume = async (
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
        message: "No resume found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching resume",
    });
  }
};

export const deleteResume = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const resume = await Resume.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!resume) {
      res.status(404).json({
        success: false,
        message: "Resume not found or unauthorized",
      });
      return;
    }

    // Delete Cloudinary asset or local file
    if (resume.publicId) {
      await deleteFromCloudinary(resume.publicId);
    } else if (resume.fileName) {
      const filePath = path.join(process.cwd(), "uploads", "resumes", resume.fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Error removing file:", e);
        }
      }
    }

    // Clear user resumeUrl
    await User.findByIdAndUpdate(req.userId, {
      resumeUrl: "",
    });

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting resume",
    });
  }
};
