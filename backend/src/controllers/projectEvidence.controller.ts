import { Request, Response } from "express";
import ProjectEvidence from "../models/ProjectEvidence";
import Resume from "../models/Resume";
import {
  runGitHubEvidencePipeline,
  validateAndNormalizeGitHubUrl,
} from "../services/githubEvidence.service";

/**
 * Runs the GitHub Project Evidence Verification Pipeline for a resume project.
 * POST /api/project-evidence/analyze
 */
export const analyzeProjectEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectTitle, repositoryUrl, resumeId, claimedSkills } = req.body;

    if (!projectTitle || typeof projectTitle !== "string" || !projectTitle.trim()) {
      res.status(400).json({
        success: false,
        message: "Project title is required.",
      });
      return;
    }

    if (!repositoryUrl || typeof repositoryUrl !== "string" || !repositoryUrl.trim()) {
      res.status(400).json({
        success: false,
        message: "Repository URL is required.",
      });
      return;
    }

    // SSRF & URL validation
    const urlValidation = validateAndNormalizeGitHubUrl(repositoryUrl);
    if (!urlValidation.isValid || !urlValidation.owner || !urlValidation.repo || !urlValidation.canonicalUrl) {
      res.status(400).json({
        success: false,
        message: urlValidation.error || "Invalid GitHub repository URL.",
      });
      return;
    }

    let effectiveSkills: string[] = Array.isArray(claimedSkills) ? claimedSkills : [];
    let effectiveResumeId = resumeId;

    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, user: req.userId });
      if (!resume) {
        res.status(404).json({
          success: false,
          message: "Specified resume not found or unauthorized.",
        });
        return;
      }
      effectiveResumeId = resume._id;
    }

    const resume = resumeId
      ? await Resume.findOne({ _id: resumeId, user: req.userId })
      : await Resume.findOne({ user: req.userId }).sort({ updatedAt: -1 });

    if (resume) {
      effectiveResumeId = resume._id;
      if (effectiveSkills.length === 0 && resume.parsedData?.projects) {
        const matchingProject = resume.parsedData.projects.find(
          (p) => p.title.toLowerCase().trim() === projectTitle.toLowerCase().trim()
        );
        if (matchingProject) {
          if (matchingProject.technologies && matchingProject.technologies.length > 0) {
            effectiveSkills.push(...matchingProject.technologies);
          }
        }
      }

      // If still empty, use overall resume extracted skills
      if (effectiveSkills.length === 0 && resume.extractedSkills) {
        effectiveSkills.push(...resume.extractedSkills.slice(0, 8).map((s) => s.name));
      }
    }

    // Deduplicate skills
    effectiveSkills = Array.from(new Set(effectiveSkills.map((s) => s.trim()))).filter(Boolean);

    // Run the Evidence Verification Pipeline
    const report = await runGitHubEvidencePipeline({
      projectTitle: projectTitle.trim(),
      repositoryUrl: urlValidation.canonicalUrl,
      claimedSkills: effectiveSkills,
    });

    // Upsert into ProjectEvidence collection
    const savedEvidence = await ProjectEvidence.findOneAndUpdate(
      {
        user: req.userId,
        projectTitle: projectTitle.trim(),
      },
      {
        user: req.userId,
        resumeId: effectiveResumeId,
        projectTitle: report.projectTitle,
        repositoryUrl: report.repositoryUrl,
        owner: report.owner,
        repo: report.repo,
        defaultBranch: report.defaultBranch,
        metadata: report.metadata,
        filesScanned: report.filesScanned,
        declaredDependencies: report.declaredDependencies,
        observedImports: report.observedImports,
        architecturalSignals: report.architecturalSignals,
        claimAssessments: report.claimAssessments,
        summary: report.summary,
        interviewQuestions: report.interviewQuestions,
        analyzedAt: new Date(report.analyzedAt),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "GitHub repository analyzed and project evidence verified successfully.",
      data: savedEvidence,
    });
  } catch (error: any) {
    console.error("Error analyzing project evidence:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to analyze GitHub repository evidence.",
    });
  }
};

/**
 * Retrieves verified evidence for a specific project title.
 * GET /api/project-evidence/project/:projectTitle
 */
export const getProjectEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawProjectTitle = req.params.projectTitle;
    const projectTitle = Array.isArray(rawProjectTitle) ? rawProjectTitle[0] : rawProjectTitle;
    if (!projectTitle || !projectTitle.trim()) {
      res.status(400).json({ success: false, message: "Project title is required." });
      return;
    }

    const evidence = await ProjectEvidence.findOne({
      user: req.userId,
      projectTitle: { $regex: new RegExp(`^${projectTitle.trim()}$`, "i") },
    });

    if (!evidence) {
      res.status(200).json({
        success: true,
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: evidence,
    });
  } catch (error: any) {
    console.error("Error retrieving project evidence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve project evidence.",
    });
  }
};

/**
 * Retrieves all verified project evidence records for the authenticated user.
 * GET /api/project-evidence/user
 */
export const getAllUserProjectEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await ProjectEvidence.find({ user: req.userId }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error("Error retrieving user project evidence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve project evidence records.",
    });
  }
};

/**
 * Deletes a project evidence record.
 * DELETE /api/project-evidence/:id
 */
export const deleteProjectEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await ProjectEvidence.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        message: "Project evidence record not found or unauthorized.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Project evidence record deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error deleting project evidence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project evidence.",
    });
  }
};

/**
 * Retrieves a specific project evidence record by its MongoDB ID.
 * GET /api/project-evidence/:id
 */
export const getProjectEvidenceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await ProjectEvidence.findOne({
      _id: id,
      user: req.userId,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        message: "Project evidence record not found or unauthorized.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error("Error retrieving project evidence by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve project evidence record.",
    });
  }
};
