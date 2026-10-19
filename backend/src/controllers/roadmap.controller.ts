import { Request, Response } from "express";
import Resume from "../models/Resume";
import Roadmap from "../models/Roadmap";
import { parseJobDescription } from "../services/jobDescription.service";
import { calculateJobMatch } from "../services/jobMatch.service";
import { extractSkills } from "../services/skillExtractor.service";
import { generateRoadmap } from "../services/roadmap.service";
import { canonicalizeSkillName } from "../data/skills/skillDependencyGraph";

/**
 * Generates an intelligent learning roadmap for the authenticated user based on a job description.
 * Reuses the existing Phase 1 matching engine to detect missing skills and expands prerequisites.
 */
export const generateLearningRoadmap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resumeId, jobDescription, jobTitle } = req.body;

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

    // 1. Existing Phase 1 Matching
    const parsedJob = parseJobDescription(jobDescription);
    const match = calculateJobMatch(parsedJob.requirements, skillsToMatch);

    // 2. Collect missing requirements with their recognized priorities
    const missingSkillsForRoadmap: Array<{ name: string; priority: "required" | "preferred" | "unspecified" }> = [
      ...match.missingRequired.map((r) => ({ name: r.name, priority: "required" as const })),
      ...match.missingUnspecified.map((r) => ({ name: r.name, priority: "unspecified" as const })),
      ...match.missingPreferred.map((r) => ({ name: r.name, priority: "preferred" as const })),
    ];

    const demonstratedSkillNames = skillsToMatch.map((s) => s.name);

    // 3. Generate graph & roadmap
    const roadmapData = await generateRoadmap({
      missingSkills: missingSkillsForRoadmap,
      demonstratedSkills: demonstratedSkillNames,
      jobTitle: jobTitle || "Target Role",
      jobDescriptionText: jobDescription,
    });

    // 4. Persist in MongoDB
    const persistedRoadmap = await Roadmap.findOneAndUpdate(
      { user: req.userId },
      {
        user: req.userId,
        jobTitle: roadmapData.targetRole,
        jobDescriptionSnippet: roadmapData.jobDescriptionSummary,
        totalSteps: roadmapData.totalSteps,
        completedSteps: roadmapData.completedSteps,
        completionPercentage: roadmapData.completionPercentage,
        targetMissingSkills: missingSkillsForRoadmap.map((s) => s.name),
        unmetPrerequisites: Array.from(
          new Set(
            roadmapData.steps
              .filter((s) => s.priority === "prerequisite")
              .map((s) => s.skillName)
          )
        ),
        demonstratedSkills: demonstratedSkillNames,
        steps: roadmapData.steps,
        rationale: roadmapData.rationale,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        roadmap: {
          ...roadmapData,
          _id: persistedRoadmap._id,
        },
        match,
      },
    });
  } catch (error) {
    console.error("Error generating learning roadmap:", error);
    res.status(500).json({ success: false, message: "Server error generating learning roadmap" });
  }
};

/**
 * Retrieves the authenticated user's current active learning roadmap.
 */
export const getActiveRoadmap = async (req: Request, res: Response): Promise<void> => {
  try {
    const roadmap = await Roadmap.findOne({ user: req.userId }).sort({ updatedAt: -1 });

    if (!roadmap) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    res.status(200).json({ success: true, data: roadmap });
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    res.status(500).json({ success: false, message: "Server error fetching learning roadmap" });
  }
};

/**
 * Updates the completion status of a specific roadmap step for the authenticated user.
 */
export const updateRoadmapStepStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roadmapId, skillName, status } = req.body;

    if (!roadmapId || !skillName || !["not_started", "in_progress", "completed"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid roadmapId, skillName, and status (not_started, in_progress, completed).",
      });
      return;
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, user: req.userId });
    if (!roadmap) {
      res.status(404).json({ success: false, message: "Roadmap not found or unauthorized." });
      return;
    }

    const canonicalTarget = canonicalizeSkillName(skillName).toLowerCase();
    const stepIndex = roadmap.steps.findIndex(
      (s) => s.skillName.toLowerCase() === canonicalTarget || s.skillName.toLowerCase() === skillName.toLowerCase()
    );

    if (stepIndex === -1) {
      res.status(404).json({ success: false, message: `Skill "${skillName}" not found in roadmap.` });
      return;
    }

    const step = roadmap.steps[stepIndex];
    let prerequisiteWarning: string | undefined;

    // Prerequisite check when marking complete: verify if prior prerequisites in this roadmap are still not started
    if (status === "completed" && step.prerequisites && step.prerequisites.length > 0) {
      const unmetPrereqsInRoadmap = roadmap.steps.filter(
        (s) => step.prerequisites.includes(s.skillName) && s.status !== "completed"
      );
      if (unmetPrereqsInRoadmap.length > 0) {
        prerequisiteWarning = `Note: Prerequisite(s) ${unmetPrereqsInRoadmap.map((p) => p.skillName).join(", ")} are still incomplete.`;
      }
    }

    step.status = status;
    if (status === "completed") {
      step.completedAt = new Date();
    } else {
      step.completedAt = undefined;
    }

    roadmap.completedSteps = roadmap.steps.filter((s) => s.status === "completed").length;
    roadmap.completionPercentage =
      roadmap.totalSteps > 0
        ? Math.round((roadmap.completedSteps / roadmap.totalSteps) * 100)
        : 100;

    await roadmap.save();

    res.status(200).json({
      success: true,
      data: roadmap,
      warning: prerequisiteWarning,
    });
  } catch (error) {
    console.error("Error updating roadmap step status:", error);
    res.status(500).json({ success: false, message: "Server error updating roadmap step" });
  }
};
