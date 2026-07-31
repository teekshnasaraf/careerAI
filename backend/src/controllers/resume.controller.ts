import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Resume from "../models/Resume";
import User from "../models/User";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

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

    // Upload file to Cloudinary & remove temporary file
    const cloudinaryResult = await uploadToCloudinary(tempFilePath);
    const { fileUrl, publicId } = cloudinaryResult;

    // Check if user already has an existing resume (replace existing instead of creating duplicates)
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

      // Overwrite existing resume
      existingResume.originalName = originalname;
      existingResume.fileName = filename;
      existingResume.fileUrl = fileUrl;
      existingResume.publicId = publicId;
      existingResume.fileSize = size;
      existingResume.mimeType = mimetype;
      existingResume.status = "uploaded";
      existingResume.atsScore = Math.floor(Math.random() * 15) + 80;
      existingResume.parsedData = {
        summary: `Parsed content for ${originalname}. Ready for deep AI feedback.`,
        skills: ["TypeScript", "React", "Node.js", "MongoDB", "REST APIs", "Tailwind CSS"],
      };

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
        status: "uploaded",
        atsScore: 85,
        parsedData: {
          summary: `Parsed content for ${originalname}. Ready for deep AI feedback.`,
          skills: ["TypeScript", "React", "Node.js", "MongoDB", "REST APIs", "Tailwind CSS"],
        },
      });
    }

    // Update user profile resumeUrl
    await User.findByIdAndUpdate(req.userId, {
      resumeUrl: fileUrl,
    });

    res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
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
