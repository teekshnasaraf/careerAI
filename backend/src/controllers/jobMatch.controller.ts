import { Request, Response } from "express";
import Resume from "../models/Resume";
import { parseJobDescription } from "../services/jobDescription.service";
import { calculateJobMatch } from "../services/jobMatch.service";
import { extractSkills } from "../services/skillExtractor.service";

export const matchJobDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeId, jobDescription } = req.body;

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      res.status(400).json({ success: false, message: "Please provide a job description." });
      return;
    }

    const resume = resumeId
      ? await Resume.findOne({ _id: resumeId, user: req.userId })
      : await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });

    if (!resume) {
      res.status(404).json({ success: false, message: "Resume not found or unauthorized." });
      return;
    }

    let skillsToMatch = resume.extractedSkills || [];
    if (skillsToMatch.length === 0 && (resume.cleanedText || resume.rawText)) {
      const text = resume.cleanedText || resume.rawText || "";
      skillsToMatch = extractSkills({ cleanedText: text, sections: resume.sections as any }).skills;
    }

    const parsedJob = parseJobDescription(jobDescription);
    const match = calculateJobMatch(parsedJob.requirements, skillsToMatch);

    res.status(200).json({
      success: true,
      match,
      data: {
        jobRequirements: parsedJob.requirements,
        totalDetectedRequirements: parsedJob.totalDetectedRequirements,
        match,
      },
    });
  } catch (error) {
    console.error("Error matching job description:", error);
    res.status(500).json({ success: false, message: "Server error matching job description" });
  }
};
