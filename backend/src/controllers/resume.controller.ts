import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Resume from "../models/Resume";
import User from "../models/User";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { extractTextFromFile, parseResumeText } from "../services/resumeParser.service";

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
    let parsedResult = {
      summary: "",
      skills: [] as string[],
      experience: [] as Array<{
        title: string;
        company: string;
        duration: string;
        bulletPoints: string[];
      }>,
      education: [] as Array<{
        degree: string;
        institution: string;
        year: string;
      }>,
      projects: [] as Array<{
        title: string;
        description: string;
        technologies: string[];
      }>,
      sectionChecklist: [] as Array<{
        name: string;
        key: string;
        found: boolean;
        scoreImpact: string;
        recommendation: string;
      }>,
      atsBreakdown: {
        sectionStructureScore: 15,
        skillsCoverageScore: 10,
        readabilityScore: 20,
        impactMetricsScore: 5,
      },
      aiFeedback: [] as Array<{
        type: "strength" | "warning" | "tip";
        title: string;
        description: string;
        actionableStep: string;
      }>,
      atsScore: 50,
    };

    try {
      const extractedText = await extractTextFromFile(tempFilePath, mimetype);
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

      // Overwrite existing resume with parsed data
      existingResume.originalName = originalname;
      existingResume.fileName = filename;
      existingResume.fileUrl = fileUrl;
      existingResume.publicId = publicId;
      existingResume.fileSize = size;
      existingResume.mimeType = mimetype;
      existingResume.status = "parsed";
      existingResume.atsScore = parsedResult.atsScore;
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
      // Create new resume document
      resume = await Resume.create({
        user: req.userId,
        originalName: originalname,
        fileName: filename,
        fileUrl,
        publicId,
        fileSize: size,
        mimeType: mimetype,
        status: "parsed",
        atsScore: parsedResult.atsScore,
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
