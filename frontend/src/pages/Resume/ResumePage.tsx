import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  Award,
  Layers,
  Loader2,
  Briefcase,
  GraduationCap,
  FolderGit2,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Check,
  X,
  ArrowRight,
  Target,
  Calculator,
  TrendingUp,
  Info,
  ListFilter,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Compass,
  BookOpen,
  Code2,
  ShieldCheck,
  Boxes,
  Cpu,
  Video,
} from "lucide-react";

import ResumeUploadCard, { formatFileSize } from "../../components/resume/ResumeUploadCard";
import { getLatestResumeApi, deleteResumeApi } from "../../features/resume/resume.service";
import {
  matchJobDescriptionApi,
  generateJobRoadmapApi,
  getActiveRoadmapApi,
  updateRoadmapStepStatusApi,
  type JobMatchResult,
  type ProjectJobRelevance,
  type PersonalizedRoadmap,
} from "../../features/jobs/jobs.service";
import {
  analyzeProjectEvidenceApi,
  getAllUserProjectEvidenceApi,
  type ProjectEvidenceData,
} from "../../features/projectEvidence/projectEvidence.service";
import type { ResumeData } from "../../types/resume";
import axios from "axios";

function ResumePage() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ats_insights" | "overview" | "experience" | "education" | "projects" | "job_match">("ats_insights");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Job Match State
  const [jobDescriptionInput, setJobDescriptionInput] = useState<string>("");
  const [matchingJob, setMatchingJob] = useState(false);
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(null);
  const [jobMatchError, setJobMatchError] = useState<string | null>(null);
  const [projectRelevance, setProjectRelevance] = useState<ProjectJobRelevance[] | null>(null);
  const [requirementFilter, setRequirementFilter] = useState<"all" | "matched" | "missing">("all");
  const [showCalculationDetails, setShowCalculationDetails] = useState(true);

  // Roadmap State
  const [roadmap, setRoadmap] = useState<PersonalizedRoadmap | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [roadmapWarning, setRoadmapWarning] = useState<string | null>(null);
  const [roadmapView, setRoadmapView] = useState<"steps" | "graph">("steps");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | "all">("all");
  const [updatingStepSkill, setUpdatingStepSkill] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const navigate = useNavigate();

  // Phase 4 GitHub Project Evidence State
  const [projectEvidenceMap, setProjectEvidenceMap] = useState<Record<string, ProjectEvidenceData>>({});
  const [projectUrlInputs, setProjectUrlInputs] = useState<Record<string, string>>({});
  const [verifyingProjectTitle, setVerifyingProjectTitle] = useState<string | null>(null);
  const [verificationErrors, setVerificationErrors] = useState<Record<string, string>>({});
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const fetchProjectEvidence = async () => {
    try {
      const res = await getAllUserProjectEvidenceApi();
      if (res.success && res.data) {
        const map: Record<string, ProjectEvidenceData> = {};
        for (const item of res.data) {
          map[item.projectTitle.toLowerCase().trim()] = item;
        }
        setProjectEvidenceMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch project evidence records:", err);
    }
  };

  const fetchResume = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getLatestResumeApi();
      if (res.success) {
        setResume(res.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch resume:", err);
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || "Failed to load resume information");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
    const fetchActiveRoadmap = async () => {
      try {
        const res = await getActiveRoadmapApi();
        if (res.success && res.data) {
          setRoadmap(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch active roadmap:", err);
      }
    };
    fetchActiveRoadmap();
    fetchProjectEvidence();
  }, []);

  const handleVerifyProjectEvidence = async (projectTitle: string, claimedSkills: string[]) => {
    const url = projectUrlInputs[projectTitle]?.trim();
    if (!url) {
      setVerificationErrors((prev) => ({
        ...prev,
        [projectTitle]: "Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).",
      }));
      return;
    }

    try {
      setVerifyingProjectTitle(projectTitle);
      setVerificationErrors((prev) => ({ ...prev, [projectTitle]: "" }));

      const res = await analyzeProjectEvidenceApi({
        projectTitle,
        repositoryUrl: url,
        resumeId: resume?._id,
        claimedSkills,
      });

      if (res.success && res.data) {
        setProjectEvidenceMap((prev) => ({
          ...prev,
          [projectTitle.toLowerCase().trim()]: res.data,
        }));
        setExpandedEvidence((prev) => ({ ...prev, [projectTitle]: true }));
      }
    } catch (err: any) {
      console.error("Project evidence verification error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to verify repository evidence.";
      setVerificationErrors((prev) => ({ ...prev, [projectTitle]: msg }));
    } finally {
      setVerifyingProjectTitle(null);
    }
  };

  const handleStartProjectInterview = (evidence: ProjectEvidenceData) => {
    navigate("/interview", {
      state: {
        projectEvidenceId: evidence._id,
        projectTitle: evidence.projectTitle,
      },
    });
  };

  const handleUploadSuccess = (newResume: ResumeData) => {
    setResume(newResume);
    setShowReplaceModal(false);
  };

  const handleOpenInNewTab = () => {
    if (resume?.fileUrl) {
      window.open(resume.fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (!resume?.fileUrl) return;
    const link = document.createElement("a");
    link.href = resume.fileUrl;
    link.download = resume.originalName || "Resume.pdf";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!resume) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${resume.originalName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const res = await deleteResumeApi(resume._id);
      if (res.success) {
        setResume(null);
        setShowReplaceModal(false);
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
      alert("Failed to delete resume. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMatchJob = async () => {
    if (!jobDescriptionInput.trim()) {
      setJobMatchError("Please enter a job description to match against.");
      return;
    }
    try {
      setMatchingJob(true);
      setJobMatchError(null);
      const res = await matchJobDescriptionApi(jobDescriptionInput, resume?._id);
      if (res.success && res.match) {
        setJobMatchResult(res.match);
        setProjectRelevance(res.projectRelevance ?? null);
      } else {
        setJobMatchError(res.message || "Failed to calculate job match.");
      }
    } catch (err: unknown) {
      console.error("Job match error:", err);
      if (axios.isAxiosError(err)) {
        setJobMatchError(err.response?.data?.message || "Failed to calculate job match.");
      } else {
        setJobMatchError("Failed to calculate job match.");
      }
    } finally {
      setMatchingJob(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!jobDescriptionInput.trim()) {
      setJobMatchError("Please enter a job description to generate a learning roadmap.");
      return;
    }
    try {
      setGeneratingRoadmap(true);
      setRoadmapError(null);
      setRoadmapWarning(null);
      const res = await generateJobRoadmapApi(jobDescriptionInput, resume?._id);
      if (res.success && res.data.roadmap) {
        setRoadmap(res.data.roadmap);
        if (res.data.match) {
          setJobMatchResult(res.data.match);
        }
      } else {
        setRoadmapError(res.message || "Failed to generate learning roadmap.");
      }
    } catch (err: unknown) {
      console.error("Failed to generate roadmap:", err);
      if (axios.isAxiosError(err)) {
        setRoadmapError(err.response?.data?.message || "Failed to generate learning roadmap");
      } else {
        setRoadmapError("Failed to generate learning roadmap");
      }
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const handleUpdateStepStatus = async (
    skillName: string,
    newStatus: "not_started" | "in_progress" | "completed"
  ) => {
    if (!roadmap?._id) return;
    try {
      setUpdatingStepSkill(skillName);
      setRoadmapWarning(null);
      const res = await updateRoadmapStepStatusApi(roadmap._id, skillName, newStatus);
      if (res.success && res.data) {
        setRoadmap(res.data);
        if (res.warning) {
          setRoadmapWarning(res.warning);
        }
      }
    } catch (err) {
      console.error("Failed to update step status:", err);
    } finally {
      setUpdatingStepSkill(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Analyzing document structure & calculating ATS optimization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            ATS Optimization & Resume Insights
          </h1>
          <p className="mt-1 text-gray-500">
            Detailed breakdown of section completeness, detected skills, and actionable ATS improvement recommendations.
          </p>
        </div>

        {resume && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReplaceModal(!showReplaceModal)}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
            >
              <RefreshCw size={16} />
              {showReplaceModal ? "Cancel Replace" : "Replace Resume"}
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 active:scale-95"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete Resume
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-100">
          {errorMsg}
        </div>
      )}

      {/* Upload Box (When no resume is uploaded OR when replace mode is active) */}
      {(!resume || showReplaceModal) && (
        <div className="py-4">
          <ResumeUploadCard onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Active Resume Display & ATS Analysis */}
      {resume && (
        <>
          {/* Top Score Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">ATS Match Score</span>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-600">{resume.atsScore || 50}%</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    (resume.atsScore || 50) >= 75
                      ? "text-emerald-700 bg-emerald-100"
                      : (resume.atsScore || 50) >= 60
                      ? "text-amber-700 bg-amber-100"
                      : "text-red-700 bg-red-100"
                  }`}
                >
                  {(resume.atsScore || 50) >= 75 ? "High ATS Score" : (resume.atsScore || 50) >= 60 ? "Moderate ATS Score" : "Needs Optimization"}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Calculated from your resume structure, detected sections, and extracted keywords</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Uploaded File</span>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 truncate font-semibold text-gray-900" title={resume.originalName}>
                {resume.originalName}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {formatFileSize(resume.fileSize)} • Uploaded {new Date(resume.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Extracted Skills</span>
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-gray-900">
                {resume.parsedData?.skills?.length || 0}
              </div>
              <p className="mt-2 text-xs text-gray-500">Explicit tech skills found in text</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Detected Sections</span>
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-purple-600">
                {resume.sectionChecklist?.filter((s) => s.found).length || 0} / {resume.sectionChecklist?.length || 6}
              </div>
              <p className="mt-2 text-xs text-gray-500">Standard ATS headers identified</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{resume.originalName}</h3>
                <p className="text-xs text-gray-500">
                  Size: {formatFileSize(resume.fileSize)} • Stored securely
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
              >
                <ExternalLink size={16} />
                Open File
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="space-y-6">
            <div className="flex flex-wrap border-b border-gray-200 gap-2">
              <button
                onClick={() => setActiveTab("ats_insights")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "ats_insights"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Sparkles size={16} />
                Elaborate ATS Insights
              </button>
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Skills & Summary ({resume.parsedData?.skills?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("experience")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "experience"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Briefcase size={16} />
                Work Experience ({resume.parsedData?.experience?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("education")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "education"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <GraduationCap size={16} />
                Education ({resume.parsedData?.education?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "projects"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FolderGit2 size={16} />
                Projects ({resume.parsedData?.projects?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("job_match")}
                className={`pb-4 px-5 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeTab === "job_match"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Target size={16} />
                Job Description Match
              </button>
            </div>

            {/* TAB 1: Elaborate ATS Insights */}
            {activeTab === "ats_insights" && (
              <div className="space-y-8">
                {/* 1. Sub-Score Progress Breakdown */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">ATS Scoring Breakdown</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Why your document received an ATS score of <span className="font-bold text-gray-900">{resume.atsScore}%</span>:
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Sub-Score 1 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700">Section Completeness</span>
                        <span className="text-blue-600">{resume.atsBreakdown?.sectionStructureScore || 15} / 30 pts</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${((resume.atsBreakdown?.sectionStructureScore || 15) / 30) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500">Presence of standard headers (Summary, Work Experience, Skills, Education)</p>
                    </div>

                    {/* Sub-Score 2 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700">Skills & Keyword Density</span>
                        <span className="text-purple-600">{resume.atsBreakdown?.skillsCoverageScore || 10} / 30 pts</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${((resume.atsBreakdown?.skillsCoverageScore || 10) / 30) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500">Number of verifiable industry tools & technical keywords found</p>
                    </div>

                    {/* Sub-Score 3 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700">Layout Readability & Format</span>
                        <span className="text-emerald-600">{resume.atsBreakdown?.readabilityScore || 20} / 25 pts</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${((resume.atsBreakdown?.readabilityScore || 20) / 25) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500">Document line count and parser text extractability</p>
                    </div>

                    {/* Sub-Score 4 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700">Quantifiable Metrics & Impact</span>
                        <span className="text-amber-600">{resume.atsBreakdown?.impactMetricsScore || 5} / 15 pts</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${((resume.atsBreakdown?.impactMetricsScore || 5) / 15) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500">Inclusion of numbers, percentages (%), and dollar metrics</p>
                    </div>
                  </div>
                </div>

                {/* 2. Standard ATS Section Checklist Verification */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Standard ATS Sections Checklist</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        ATS scanners look for these exact standard headers to organize candidate profiles:
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.sectionChecklist?.map((item) => (
                      <div
                        key={item.name}
                        className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                          item.found ? "border-emerald-100 bg-emerald-50/30" : "border-red-100 bg-red-50/30"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${
                            item.found ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        >
                          {item.found ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                item.found ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"
                              }`}
                            >
                              {item.scoreImpact}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{item.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Elaborate Recommendations & Improvement Steps */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Detailed ATS Optimization Recommendations</h3>

                  <div className="space-y-4">
                    {resume.aiFeedback?.map((feedback, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-5 space-y-3 ${
                          feedback.type === "strength"
                            ? "border-emerald-100 bg-emerald-50/30"
                            : feedback.type === "warning"
                            ? "border-amber-100 bg-amber-50/30"
                            : "border-blue-100 bg-blue-50/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {feedback.type === "strength" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          ) : feedback.type === "warning" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          ) : (
                            <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                          <h4 className="font-bold text-gray-900 text-sm">{feedback.title}</h4>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed pl-8">{feedback.description}</p>

                        {feedback.actionableStep && (
                          <div className="ml-8 flex items-center gap-2 rounded-lg bg-white p-3 text-xs font-semibold text-gray-800 border border-gray-200">
                            <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>Action Step: {feedback.actionableStep}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Skills & Summary */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900">Extracted Summary / Profile</h3>
                  {resume.parsedData?.summary ? (
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {resume.parsedData.summary}
                    </p>
                  ) : (
                    <div className="mt-3 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">No professional summary section detected</p>
                        <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                          Add a section titled <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">Summary</code> or <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">Profile</code> with 2–4 sentences about your background to improve ATS score.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">
                      Verified Extracted Skills ({resume.parsedData?.skills?.length || 0})
                    </h3>
                  </div>

                  {resume.parsedData?.skills && resume.parsedData.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {resume.parsedData.skills.map((skill) => (
                        <span key={skill} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 p-4 text-xs font-medium text-amber-800 border border-amber-100 flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        No explicit technical skill keywords were detected in your document text. Add a dedicated section titled "Technical Skills" listing your tools and frameworks.
                      </div>
                    </div>
                  )}
                </div>

                {/* Extracurricular & Achievements — shown when content was detected */}
                {(resume.parsedData?.extracurricular || resume.parsedData?.achievements) && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-gray-900">Activities &amp; Achievements</h3>
                    {resume.parsedData.extracurricular && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Extracurricular / Leadership</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{resume.parsedData.extracurricular}</p>
                      </div>
                    )}
                    {resume.parsedData.achievements && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Achievements / Awards</p>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{resume.parsedData.achievements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Work Experience */}
            {activeTab === "experience" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Extracted Work Experience</h3>
                {resume.parsedData?.experience && resume.parsedData.experience.length > 0 ? (
                  <div className="space-y-6">
                    {resume.parsedData.experience.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-blue-600 pl-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-bold text-gray-900 text-base">{exp.title}</h4>
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-500">{exp.company}</p>

                        {exp.bulletPoints && exp.bulletPoints.length > 0 && (
                          <ul className="mt-2 list-disc pl-4 text-xs text-gray-600 space-y-1">
                            {exp.bulletPoints.map((bp, bpIdx) => (
                              <li key={bpIdx}>{bp}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-5 border border-amber-100 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      Work Experience Section Header Not Detected
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      The parser could not locate an explicit 'Work Experience' or 'Employment History' section in your resume. ATS scanners look for standard section headers to rank your experience.
                    </p>
                    <div className="pt-2 text-xs font-semibold text-amber-900">
                      Tip: Add a header labeled <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">Work Experience</code> above your job positions or internships to resolve this.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Education */}
            {activeTab === "education" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Extracted Education</h3>
                {resume.parsedData?.education && resume.parsedData.education.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {resume.parsedData.education.map((edu, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                          <h4 className="font-bold text-gray-900 text-sm">{edu.degree}</h4>
                        </div>
                        {edu.institution && (
                          <p className="text-xs text-gray-500">{edu.institution}</p>
                        )}
                        {edu.year && (
                          <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                            {/[-–—]/.test(edu.year) ? "Period" : "Year"}: {edu.year}
                          </span>
                        )}
                        {edu.score && (
                          <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full ml-1.5">
                            {edu.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No Education entries detected in document text.</p>
                )}
              </div>
            )}

            {/* TAB 5: Projects */}
            {activeTab === "projects" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Extracted Projects & GitHub Evidence</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verify candidate resume claims against real repository files, detect architectural signals, and launch project-grounded technical interviews.
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                    <FolderGit2 size={13} /> Phase 4 Evidence Engine
                  </span>
                </div>

                {resume.parsedData?.projects && resume.parsedData.projects.length > 0 ? (
                  <div className="space-y-6">
                    {resume.parsedData.projects.map((proj, idx) => {
                      const analysis = resume.projectAnalysis?.find((a) => a.title === proj.title);
                      const normTitle = proj.title.toLowerCase().trim();
                      const evidence = projectEvidenceMap[normTitle];
                      const currentInputUrl =
                        projectUrlInputs[proj.title] !== undefined
                          ? projectUrlInputs[proj.title]
                          : proj.links?.find((l) => l.includes("github.com")) || "";
                      const isVerifying = verifyingProjectTitle === proj.title;
                      const errorMsg = verificationErrors[proj.title];
                      const isExpanded = expandedEvidence[proj.title] ?? Boolean(evidence);

                      // Claimed skills: technologies or detected skills
                      const claimedSkills = Array.from(
                        new Set([
                          ...(proj.technologies || []),
                          ...(analysis?.detectedSkills || []),
                        ])
                      );

                      return (
                        <div key={idx} className="rounded-xl border border-gray-200 p-5 space-y-4 bg-white shadow-sm hover:border-gray-300 transition">
                          {/* Project title + strength badge */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">{proj.title}</h4>
                              {analysis && analysis.domains.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {analysis.domains.map((domain) => (
                                    <span
                                      key={domain.name}
                                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
                                      title={`Confidence: ${Math.round(domain.confidence * 100)}%`}
                                    >
                                      {domain.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {analysis && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                    analysis.strength.overall >= 70
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : analysis.strength.overall >= 40
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-gray-50 text-gray-500 border-gray-200"
                                  }`}
                                  title={`Impl: ${analysis.strength.implementationEvidence} | Depth: ${analysis.strength.technicalDepth} | Outcomes: ${analysis.strength.measurableOutcomes} | Deploy: ${analysis.strength.deploymentEvidence} | Richness: ${analysis.strength.descriptionRichness}`}
                                >
                                  Portfolio Strength {analysis.strength.overall}/100
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {proj.description && (
                            <p className="text-xs text-gray-600 leading-relaxed">{proj.description}</p>
                          )}

                          {/* Detected skills from resume */}
                          {claimedSkills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] font-semibold text-gray-400 mr-1">Claimed Tech:</span>
                              {claimedSkills.map((skill) => (
                                <span key={skill} className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-100">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* External Links */}
                          {proj.links && proj.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {proj.links.map((link, linkIdx) => (
                                <a
                                  key={linkIdx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 transition"
                                >
                                  <ExternalLink size={11} />
                                  {link.replace(/^https?:\/\//, "").slice(0, 40)}{link.length > 45 ? "…" : ""}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* ─── GitHub Project Evidence Verification Section ─── */}
                          <div className="mt-4 pt-4 border-t border-gray-100 rounded-xl bg-gradient-to-br from-slate-50/80 via-white to-purple-50/30 p-4 border space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FolderGit2 className="h-4 w-4 text-purple-600" />
                                <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                  GitHub Repository Evidence Verification
                                </h5>
                              </div>
                              {evidence && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedEvidence((prev) => ({
                                      ...prev,
                                      [proj.title]: !isExpanded,
                                    }))
                                  }
                                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Collapse Details</span>
                                      <ChevronUp size={14} />
                                    </>
                                  ) : (
                                    <>
                                      <span>View Evidence ({evidence.summary.supportedCount}/{evidence.summary.totalClaims} Supported)</span>
                                      <ChevronDown size={14} />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Repository URL Input & Verification Action */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="url"
                                  placeholder="https://github.com/owner/repository"
                                  value={currentInputUrl}
                                  onChange={(e) =>
                                    setProjectUrlInputs((prev) => ({
                                      ...prev,
                                      [proj.title]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={isVerifying}
                                onClick={() => handleVerifyProjectEvidence(proj.title, claimedSkills)}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60 transition shrink-0"
                              >
                                {isVerifying ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Scanning Code Evidence...</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} />
                                    <span>{evidence ? "Re-verify Evidence" : "Verify Repository Evidence"}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {errorMsg && (
                              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>{errorMsg}</span>
                              </div>
                            )}

                            {/* Verified Evidence Details Panel */}
                            {evidence && isExpanded && (
                              <div className="space-y-4 pt-2 animate-fadeIn">
                                {/* Repo Overview Banner */}
                                <div className="rounded-xl border border-purple-100 bg-white p-3.5 shadow-sm space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-gray-900">{evidence.owner}/{evidence.repo}</span>
                                      <a
                                        href={evidence.repositoryUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink size={10} /> View Repo
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                      <span>★ {evidence.metadata.stars} stars</span>
                                      <span>•</span>
                                      <span>⑂ {evidence.metadata.forks} forks</span>
                                      <span>•</span>
                                      <span>Branch: {evidence.defaultBranch}</span>
                                      <span>•</span>
                                      <span>License: {evidence.metadata.license}</span>
                                    </div>
                                  </div>

                                  {evidence.metadata.description && (
                                    <p className="text-xs text-gray-600 italic">"{evidence.metadata.description}"</p>
                                  )}

                                  {/* Languages Bar */}
                                  {evidence.metadata.languages && Object.keys(evidence.metadata.languages).length > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                                        <span>Detected Languages</span>
                                        <span>{Object.keys(evidence.metadata.languages).join(", ")}</span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex">
                                        {Object.entries(evidence.metadata.languages).map(([lang, bytes], lIdx) => {
                                          const totalBytes = Object.values(evidence.metadata.languages).reduce((a, b) => a + b, 0);
                                          const pct = Math.max(5, Math.round((bytes / totalBytes) * 100));
                                          const colors = ["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                                          return (
                                            <div
                                              key={lang}
                                              className={`${colors[lIdx % colors.length]}`}
                                              style={{ width: `${pct}%` }}
                                              title={`${lang}: ${pct}%`}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Architectural Signals */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    Architectural Implementation Signals
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasApiRoutes ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <Code2 size={13} />
                                      <span className="font-semibold">API Routes</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasApiRoutes ? "Verified" : "Not Found"}</span>
                                    </div>

                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasDatabaseModels ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <Boxes size={13} />
                                      <span className="font-semibold">Database Models</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasDatabaseModels ? "Verified" : "Not Found"}</span>
                                    </div>

                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasAuthentication ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <ShieldCheck size={13} />
                                      <span className="font-semibold">Authentication</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasAuthentication ? "Verified" : "Not Found"}</span>
                                    </div>

                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasTests ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <CheckCircle2 size={13} />
                                      <span className="font-semibold">Test Suite</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasTests ? "Verified" : "Not Found"}</span>
                                    </div>

                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasCiCd ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <GitBranch size={13} />
                                      <span className="font-semibold">CI/CD Pipeline</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasCiCd ? "Verified" : "Not Found"}</span>
                                    </div>

                                    <div className={`rounded-lg border p-2 text-xs flex items-center gap-2 ${evidence.architecturalSignals.hasDocker ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                      <Cpu size={13} />
                                      <span className="font-semibold">Containerized</span>
                                      <span className="ml-auto text-[10px]">{evidence.architecturalSignals.hasDocker ? "Verified" : "Not Found"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Claim Assessments */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                      Resume Claim Verification ({evidence.summary.supportedCount} Supported • {evidence.summary.partiallySupportedCount} Partial • {evidence.summary.notFoundCount} Not Found)
                                    </span>
                                  </div>

                                  <div className="grid gap-2.5">
                                    {evidence.claimAssessments.map((claim, cIdx) => {
                                      const badgeColors = {
                                        supported: "bg-emerald-50 text-emerald-800 border-emerald-200",
                                        partially_supported: "bg-amber-50 text-amber-800 border-amber-200",
                                        not_found: "bg-gray-50 text-gray-600 border-gray-200",
                                        unable_to_assess: "bg-rose-50 text-rose-700 border-rose-200",
                                      }[claim.status];

                                      const statusLabels = {
                                        supported: "Supported by repository evidence",
                                        partially_supported: "Partially supported (manifest/docs)",
                                        not_found: "Not found in scanned files",
                                        unable_to_assess: "Unable to assess",
                                      }[claim.status];

                                      return (
                                        <div key={cIdx} className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5 shadow-sm text-xs">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-900">{claim.skill}</span>
                                              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                                                {claim.evidenceType.replace("_", " ")}
                                              </span>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeColors}`}>
                                              {statusLabels}
                                            </span>
                                          </div>

                                          <p className="text-gray-600 text-[11px] leading-relaxed">{claim.explanation}</p>

                                          {claim.fileReferences && claim.fileReferences.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                              {claim.fileReferences.map((ref, rIdx) => (
                                                <span key={rIdx} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-700 border border-gray-200">
                                                  {ref.path} {ref.snippet ? `• ${ref.snippet}` : ""}
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          {claim.limitations && (
                                            <p className="text-[10px] text-gray-400 italic pt-0.5">Note: {claim.limitations}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Project-Grounded Technical Interview Action */}
                                <div className="rounded-xl bg-purple-50/80 p-3.5 border border-purple-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <h6 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                      <Sparkles size={13} className="text-purple-600" />
                                      Ready for Technical Project Defense
                                    </h6>
                                    <p className="text-[11px] text-purple-800">
                                      Conduct an adaptive technical interview asking questions grounded in your actual {evidence.owner}/{evidence.repo} files and architecture.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStartProjectInterview(evidence)}
                                    className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-purple-800 transition shrink-0"
                                  >
                                    <span>Start Grounded Interview</span>
                                    <ArrowRight size={13} />
                                  </button>
                                </div>

                                {/* Mandatory Ethical Limitations Disclaimer */}
                                <div className="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-500 border border-gray-200 flex items-start gap-2">
                                  <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
                                  <span>{evidence.summary.limitationsDisclaimer}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No Project entries detected in document text.</p>
                )}
              </div>
            )}

            {/* TAB 6: Job Description Match */}
            {activeTab === "job_match" && (
              <div className="space-y-8">
                {/* Input Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Job Description Skill Match</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Paste a complete job posting below. The parser automatically detects required vs. preferred skills from the JD context — no manual formatting required.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Step 4 Deterministic Engine
                    </span>
                  </div>

                <textarea
                    rows={8}
                    value={jobDescriptionInput}
                    onChange={(e) => setJobDescriptionInput(e.target.value)}
                    placeholder={`Paste the full job description here — no special formatting needed.

Example:
  Software Engineer
  We are looking for candidates with Python, React and DSA experience.

  Requirements:
  - Python
  - React
  - DSA

  Nice to have:
  - Docker
  - AWS`}
                    className="w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                  />

                  {jobMatchError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                      {jobMatchError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 flex-wrap">
                    <button
                      onClick={handleMatchJob}
                      disabled={matchingJob || generatingRoadmap}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50 active:scale-95"
                    >
                      {matchingJob ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Matching Skills...
                        </>
                      ) : (
                        <>
                          <Target size={16} />
                          Analyze Job Match
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGenerateRoadmap}
                      disabled={matchingJob || generatingRoadmap}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-200 transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 active:scale-95"
                    >
                      {generatingRoadmap ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Building Graph & Roadmap...
                        </>
                      ) : (
                        <>
                          <Compass size={16} />
                          Generate Learning Roadmap
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {roadmapError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                    <span>{roadmapError}</span>
                  </div>
                )}

                {/* Match Results Display */}
                {jobMatchResult && (
                  <div className="space-y-6">
                    {/* Explainable Score Overview (4-Card Metric Grid) */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Overall Score */}
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Match Score</span>
                          <Target size={18} className="text-blue-500" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          {jobMatchResult.overallScore !== null ? (
                            <>
                              <span className="text-3xl font-extrabold text-blue-600">{jobMatchResult.overallScore}%</span>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  jobMatchResult.overallScore >= 75
                                    ? "text-emerald-700 bg-emerald-100"
                                    : jobMatchResult.overallScore >= 50
                                    ? "text-amber-700 bg-amber-100"
                                    : "text-red-700 bg-red-100"
                                }`}
                              >
                                {jobMatchResult.overallScore >= 75
                                  ? "Strong Match"
                                  : jobMatchResult.overallScore >= 50
                                  ? "Moderate Match"
                                  : "Low Match"}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-gray-400">No Recognized Skills</span>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">
                          {jobMatchResult.scoreExplanation || "Weighted by Required (1.0), Preferred (0.5), Unspecified (0.75)"}
                        </p>
                      </div>

                      {/* Required Requirements */}
                      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required Skills</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Weight 1.0
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-emerald-600">{jobMatchResult.matchedRequired.length}</span>
                          <span className="text-xs text-gray-400">/ {jobMatchResult.matchedRequired.length + jobMatchResult.missingRequired.length} matched</span>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {jobMatchResult.scoreBreakdown?.categories?.required
                            ? `${jobMatchResult.scoreBreakdown.categories.required.earnedWeight} of ${jobMatchResult.scoreBreakdown.categories.required.totalPossibleWeight} weighted pts`
                            : `${jobMatchResult.missingRequired.length} skill(s) missing`}
                        </p>
                      </div>

                      {/* Preferred Requirements */}
                      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferred Skills</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Weight 0.5
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-blue-600">{jobMatchResult.matchedPreferred.length}</span>
                          <span className="text-xs text-gray-400">/ {jobMatchResult.matchedPreferred.length + jobMatchResult.missingPreferred.length} matched</span>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {jobMatchResult.scoreBreakdown?.categories?.preferred
                            ? `${jobMatchResult.scoreBreakdown.categories.preferred.earnedWeight} of ${jobMatchResult.scoreBreakdown.categories.preferred.totalPossibleWeight} weighted pts`
                            : `${jobMatchResult.missingPreferred.length} skill(s) missing`}
                        </p>
                      </div>

                      {/* Unspecified / Total Recognized */}
                      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unspecified Skills</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            Weight 0.75
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-purple-600">{jobMatchResult.matchedUnspecified.length}</span>
                          <span className="text-xs text-gray-400">/ {jobMatchResult.matchedUnspecified.length + jobMatchResult.missingUnspecified.length} matched</span>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {jobMatchResult.scoreBreakdown?.categories?.unspecified
                            ? `${jobMatchResult.scoreBreakdown.categories.unspecified.earnedWeight} of ${jobMatchResult.scoreBreakdown.categories.unspecified.totalPossibleWeight} weighted pts`
                            : `${jobMatchResult.missingUnspecified.length} skill(s) missing`}
                        </p>
                      </div>
                    </div>

                    {/* Transparent Mathematical Score Breakdown */}
                    {jobMatchResult.scoreBreakdown && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowCalculationDetails(!showCalculationDetails)}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <Calculator size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">Transparent Score Breakdown & Math</h4>
                              <p className="text-xs text-gray-500">
                                Exact formula, category weights, and weighted point contributions.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {showCalculationDetails ? (
                              <>
                                <span>Hide Calculation</span>
                                <ChevronUp size={16} />
                              </>
                            ) : (
                              <>
                                <span>Show Calculation</span>
                                <ChevronDown size={16} />
                              </>
                            )}
                          </button>
                        </div>

                        {showCalculationDetails && (
                          <div className="space-y-4 pt-2 border-t border-gray-100">
                            {/* Formula Banner */}
                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 font-mono text-xs text-slate-800 space-y-1.5">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <Info size={14} className="text-blue-600 font-sans" />
                                <span>Scoring Formula:</span>
                              </div>
                              <div className="text-slate-600 pl-5">
                                {jobMatchResult.scoreBreakdown.calculationFormula}
                              </div>
                              <div className="text-blue-700 font-semibold pl-5 pt-1">
                                {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore > 0 ? (
                                  <>
                                    ({jobMatchResult.scoreBreakdown.earnedWeightedScore} earned pts / {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore} possible pts) × 100 ={" "}
                                    <span className="text-sm font-bold text-blue-800">{jobMatchResult.scoreBreakdown.finalMatchPercentage}%</span>
                                  </>
                                ) : (
                                  <span>0 recognized requirements found. Score is null.</span>
                                )}
                              </div>
                            </div>

                            {/* Metrics Summary Strip */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center">
                                <span className="text-[11px] font-medium text-gray-500">Total Recognized</span>
                                <p className="mt-1 text-lg font-bold text-gray-800">{jobMatchResult.scoreBreakdown.totalRecognizedRequirements}</p>
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center">
                                <span className="text-[11px] font-medium text-gray-500">Matched Skills</span>
                                <p className="mt-1 text-lg font-bold text-emerald-600">{jobMatchResult.scoreBreakdown.totalMatchedRequirements}</p>
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center">
                                <span className="text-[11px] font-medium text-gray-500">Missing Skills</span>
                                <p className="mt-1 text-lg font-bold text-red-500">{jobMatchResult.scoreBreakdown.totalMissingRequirements}</p>
                              </div>
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center">
                                <span className="text-[11px] font-medium text-gray-500">Total Weighted Pts</span>
                                <p className="mt-1 text-lg font-bold text-blue-600">{jobMatchResult.scoreBreakdown.earnedWeightedScore} / {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore}</p>
                              </div>
                            </div>

                            {/* Detailed Category Table */}
                            {jobMatchResult.scoreBreakdown.categories && (
                              <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                    <tr>
                                      <th className="px-4 py-2.5 font-semibold">Priority Category</th>
                                      <th className="px-4 py-2.5 font-semibold">Weight</th>
                                      <th className="px-4 py-2.5 font-semibold">Matched / Total</th>
                                      <th className="px-4 py-2.5 font-semibold">Earned / Possible Pts</th>
                                      <th className="px-4 py-2.5 font-semibold">% of Possible Score</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-gray-700">
                                    <tr>
                                      <td className="px-4 py-2.5 font-semibold text-emerald-800 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        Required
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">{jobMatchResult.scoreBreakdown.categories.required.weightPerItem}</td>
                                      <td className="px-4 py-2.5">
                                        {jobMatchResult.scoreBreakdown.categories.required.matched} of {jobMatchResult.scoreBreakdown.categories.required.total}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">
                                        {jobMatchResult.scoreBreakdown.categories.required.earnedWeight} / {jobMatchResult.scoreBreakdown.categories.required.totalPossibleWeight} pts
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                                        {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore > 0
                                          ? `${Math.round((jobMatchResult.scoreBreakdown.categories.required.totalPossibleWeight / jobMatchResult.scoreBreakdown.totalPossibleWeightedScore) * 100)}%`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="px-4 py-2.5 font-semibold text-purple-800 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                                        Unspecified
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">{jobMatchResult.scoreBreakdown.categories.unspecified.weightPerItem}</td>
                                      <td className="px-4 py-2.5">
                                        {jobMatchResult.scoreBreakdown.categories.unspecified.matched} of {jobMatchResult.scoreBreakdown.categories.unspecified.total}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">
                                        {jobMatchResult.scoreBreakdown.categories.unspecified.earnedWeight} / {jobMatchResult.scoreBreakdown.categories.unspecified.totalPossibleWeight} pts
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                                        {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore > 0
                                          ? `${Math.round((jobMatchResult.scoreBreakdown.categories.unspecified.totalPossibleWeight / jobMatchResult.scoreBreakdown.totalPossibleWeightedScore) * 100)}%`
                                          : "0%"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="px-4 py-2.5 font-semibold text-blue-800 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                        Preferred
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">{jobMatchResult.scoreBreakdown.categories.preferred.weightPerItem}</td>
                                      <td className="px-4 py-2.5">
                                        {jobMatchResult.scoreBreakdown.categories.preferred.matched} of {jobMatchResult.scoreBreakdown.categories.preferred.total}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">
                                        {jobMatchResult.scoreBreakdown.categories.preferred.earnedWeight} / {jobMatchResult.scoreBreakdown.categories.preferred.totalPossibleWeight} pts
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                                        {jobMatchResult.scoreBreakdown.totalPossibleWeightedScore > 0
                                          ? `${Math.round((jobMatchResult.scoreBreakdown.categories.preferred.totalPossibleWeight / jobMatchResult.scoreBreakdown.totalPossibleWeightedScore) * 100)}%`
                                          : "0%"}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <p className="text-[11px] text-gray-400 italic">
                              Note: Repeated mentions and synonyms in the job description are deduplicated according to CareerAI's skill taxonomy to prevent score inflation.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prioritized Missing Skills (Action Plan) */}
                    {jobMatchResult.prioritizedMissingSkills && jobMatchResult.prioritizedMissingSkills.length > 0 ? (
                      <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                              <TrendingUp size={18} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-gray-900">Prioritized Missing Skills (Action Plan)</h4>
                              <p className="text-xs text-gray-500">
                                Ranked by priority category and potential match score impact so you know which skills to address first.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateRoadmap}
                            disabled={generatingRoadmap}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 active:scale-95 flex-shrink-0"
                          >
                            {generatingRoadmap ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Building Roadmap...
                              </>
                            ) : (
                              <>
                                <Compass size={14} />
                                Build Learning Roadmap
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-3 pt-2">
                          {jobMatchResult.prioritizedMissingSkills.map((item, index) => (
                            <div
                              key={item.name}
                              className="rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-4 transition hover:border-red-200"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                    #{index + 1}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900">{item.name}</span>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                      item.priority === "required"
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : item.priority === "unspecified"
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                  >
                                    {item.priority} (Weight {item.priorityWeight})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                    +{item.potentialScoreImpact}% potential boost
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => navigate("/interview", { state: { targetSkill: item.name, targetRole: "Full Stack Engineer" } })}
                                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
                                    title="Practice in Mock Interview"
                                  >
                                    <Video size={12} />
                                    <span>Practice</span>
                                  </button>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-gray-600 pl-8">
                                {item.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : jobMatchResult.breakdown && jobMatchResult.breakdown.length > 0 ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center shadow-sm">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                        <h4 className="text-sm font-bold text-emerald-900">All Recognized Requirements Met!</h4>
                        <p className="mt-1 text-xs text-emerald-700">
                          Your resume contains matching evidence for all recognized skills in this job description.
                        </p>
                      </div>
                    ) : null}

                    {/* Requirement-Level Evidence & Classification Explorer */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <ListFilter size={18} />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-gray-900">Requirement-Level Evidence & Classification</h4>
                            <p className="text-xs text-gray-500">
                              Every recognized job requirement with extracted resume evidence and classification reasons.
                            </p>
                          </div>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setRequirementFilter("all")}
                            className={`rounded-lg px-3 py-1.5 transition ${
                              requirementFilter === "all"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            All ({jobMatchResult.breakdown?.length || 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequirementFilter("matched")}
                            className={`rounded-lg px-3 py-1.5 transition ${
                              requirementFilter === "matched"
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            Matched ({jobMatchResult.breakdown?.filter((r) => r.matched).length || 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequirementFilter("missing")}
                            className={`rounded-lg px-3 py-1.5 transition ${
                              requirementFilter === "missing"
                                ? "bg-white text-red-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            Missing ({jobMatchResult.breakdown?.filter((r) => !r.matched).length || 0})
                          </button>
                        </div>
                      </div>

                      {/* Requirements List */}
                      {jobMatchResult.breakdown && jobMatchResult.breakdown.length > 0 ? (
                        <div className="space-y-3">
                          {jobMatchResult.breakdown
                            .filter((item) => {
                              if (requirementFilter === "matched") return item.matched;
                              if (requirementFilter === "missing") return !item.matched;
                              return true;
                            })
                            .map((item) => (
                              <div
                                key={item.name}
                                className={`rounded-xl border p-4 transition ${
                                  item.matched
                                    ? "border-emerald-100 bg-emerald-50/20"
                                    : "border-red-100 bg-red-50/20"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {item.matched ? (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <Check size={12} />
                                      </div>
                                    ) : (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                                        <X size={12} />
                                      </div>
                                    )}
                                    <span className="text-sm font-bold text-gray-900">{item.name}</span>
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                        item.priority === "required"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : item.priority === "unspecified"
                                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                                          : "bg-blue-50 text-blue-700 border border-blue-200"
                                      }`}
                                    >
                                      {item.priority} (Weight {item.requirementWeight})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {item.matched ? (
                                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                        +{item.scoreContribution ?? 0}% earned
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                        0% earned (potential +{item.potentialContribution ?? 0}%)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                                  {/* Classification Reason */}
                                  <div className="rounded-lg bg-white/80 border border-gray-100 p-2.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                      Classification Reason
                                    </span>
                                    <span className="text-gray-700 mt-0.5 block">
                                      {item.classificationReason || "Extracted from job description text"}
                                    </span>
                                  </div>

                                  {/* Evidence or Missing Explanation */}
                                  <div className="rounded-lg bg-white/80 border border-gray-100 p-2.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                      {item.matched ? "Resume Evidence" : "Match Status"}
                                    </span>
                                    {item.matched ? (
                                      item.resumeEvidence ? (
                                        <div className="mt-0.5 text-emerald-900 space-y-0.5">
                                          <div className="font-medium">
                                            Found {item.resumeEvidence.occurrences}x in:{" "}
                                            <span className="font-semibold">{item.resumeEvidence.sections.join(", ")}</span>
                                          </div>
                                          {item.resumeEvidence.matchedTexts && item.resumeEvidence.matchedTexts.length > 0 && (
                                            <p className="text-[11px] text-gray-600 italic">
                                              &ldquo;{item.resumeEvidence.matchedTexts[0]}&rdquo;
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-emerald-800 mt-0.5 block">
                                          Confirmed in parsed resume skills.
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-red-700 mt-0.5 block">
                                        {item.missingExplanation || "Not identified in any analyzed resume section."}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No recognized requirements to display.</p>
                      )}
                    </div>

                    {/* Intelligent Learning Roadmap & Skill Dependency Graph Panel */}
                    {roadmap && (
                      <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm space-y-6">
                        {/* Roadmap Header & Progress */}
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                                <Compass size={18} />
                              </div>
                              <h4 className="text-lg font-bold text-gray-900">
                                Intelligent Learning Roadmap & Skill Dependency Graph
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500">
                              Topologically sorted learning sequence using CareerAI's DAG. Prerequisites are scheduled before dependent job requirements.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setRoadmapView("steps")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                                  roadmapView === "steps"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900"
                                }`}
                              >
                                <BookOpen size={14} />
                                Ordered Steps ({roadmap.steps.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setRoadmapView("graph")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                                  roadmapView === "graph"
                                    ? "bg-white text-purple-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900"
                                }`}
                              >
                                <GitBranch size={14} />
                                Dependency Graph ({roadmap.graph?.nodes?.length || roadmap.steps.length})
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Warning Notification if any */}
                        {roadmapWarning && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                            <Info size={16} className="text-amber-600 flex-shrink-0" />
                            <span>{roadmapWarning}</span>
                          </div>
                        )}

                        {/* Progress Bar & Metric Pills */}
                        <div className="rounded-xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/70 border border-purple-100 p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Roadmap Completion</span>
                              <div className="text-2xl font-extrabold text-purple-700 mt-0.5">
                                {roadmap.completionPercentage}% Complete
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="rounded-lg bg-white/80 border border-purple-100 px-3 py-1 font-semibold text-gray-700">
                                {roadmap.completedSteps} of {roadmap.totalSteps} steps completed
                              </span>
                              <span className="rounded-lg bg-red-50 border border-red-100 px-3 py-1 font-semibold text-red-700">
                                {roadmap.targetMissingSkillsCount} target job skills
                              </span>
                              <span className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-1 font-semibold text-amber-700">
                                {roadmap.unmetPrerequisitesCount} unmet prerequisites
                              </span>
                              {roadmap.demonstratedPrerequisitesCount > 0 && (
                                <span className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                                  {roadmap.demonstratedPrerequisitesCount} already demonstrated
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${Math.min(100, Math.max(2, roadmap.completionPercentage))}%` }}
                            ></div>
                          </div>

                          <p className="text-xs text-gray-600">
                            {roadmap.rationale}
                          </p>
                        </div>

                        {/* VIEW 1: ORDERED LEARNING STEPS */}
                        {roadmapView === "steps" && (
                          <div className="space-y-4">
                            {/* Phase Filter Tabs */}
                            {roadmap.phases && roadmap.phases.length > 1 && (
                              <div className="flex flex-wrap gap-2 pt-1 border-b border-gray-100 pb-3">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhaseFilter("all")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    selectedPhaseFilter === "all"
                                      ? "bg-purple-600 text-white shadow-sm"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  All Phases ({roadmap.steps.length})
                                </button>
                                {roadmap.phases.map((ph) => (
                                  <button
                                    key={ph.phaseNumber}
                                    type="button"
                                    onClick={() => setSelectedPhaseFilter(ph.phaseNumber)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                      selectedPhaseFilter === ph.phaseNumber
                                        ? "bg-purple-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {ph.title} ({ph.stepCount})
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Steps List */}
                            <div className="space-y-4">
                              {roadmap.steps
                                .filter((s) => selectedPhaseFilter === "all" || s.phase === selectedPhaseFilter)
                                .map((step) => {
                                  const isExpanded = expandedStep === step.stepNumber;
                                  const isUpdating = updatingStepSkill === step.skillName;

                                  return (
                                    <div
                                      key={step.skillName}
                                      className={`rounded-xl border p-5 transition-all shadow-sm ${
                                        step.status === "completed"
                                          ? "border-emerald-200 bg-emerald-50/20"
                                          : step.status === "in_progress"
                                          ? "border-blue-200 bg-blue-50/20"
                                          : "border-gray-100 bg-white"
                                      }`}
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm flex-shrink-0">
                                            #{step.stepNumber}
                                          </span>
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <h5 className="text-base font-bold text-gray-900">{step.skillName}</h5>
                                              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                                {step.category}
                                              </span>
                                              <span
                                                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                  step.priority === "required"
                                                    ? "bg-red-50 text-red-700 border border-red-200"
                                                    : step.priority === "prerequisite"
                                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                                    : step.priority === "unspecified"
                                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                                }`}
                                              >
                                                {step.priority === "prerequisite" ? "Prerequisite Foundation" : `${step.priority} requirement`}
                                              </span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-600">{step.reason}</p>
                                          </div>
                                        </div>

                                        {/* Status Toggle Buttons */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => handleUpdateStepStatus(step.skillName, "not_started")}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                              step.status === "not_started"
                                                ? "bg-gray-200 text-gray-800 shadow-sm"
                                                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                            }`}
                                          >
                                            Not Started
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => handleUpdateStepStatus(step.skillName, "in_progress")}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                              step.status === "in_progress"
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                            }`}
                                          >
                                            In Progress
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => handleUpdateStepStatus(step.skillName, "completed")}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1 transition ${
                                              step.status === "completed"
                                                ? "bg-emerald-600 text-white shadow-sm"
                                                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                            }`}
                                          >
                                            <Check size={12} />
                                            Completed
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => navigate("/interview", { state: { targetSkill: step.skillName, targetRole: roadmap?.targetRole } })}
                                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1"
                                            title="Practice this skill in Mock Interview"
                                          >
                                            <Video size={12} />
                                            <span>Interview</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Prerequisites & Unlocks Badges */}
                                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                        <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1 text-gray-600">
                                          <span className="font-semibold text-gray-700">Requires: </span>
                                          {step.prerequisites && step.prerequisites.length > 0
                                            ? step.prerequisites.join(", ")
                                            : "None (Foundational)"}
                                        </div>
                                        {step.unlockedSkills && step.unlockedSkills.length > 0 && (
                                          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-indigo-700 font-semibold">
                                            Unlocks: {step.unlockedSkills.join(", ")}
                                          </div>
                                        )}
                                      </div>

                                      {/* Expand/Collapse Toggle */}
                                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                                          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <span>Hide Learning Plan</span>
                                              <ChevronUp size={14} />
                                            </>
                                          ) : (
                                            <>
                                              <span>View Learning Objective, Exercise & Deliverable</span>
                                              <ChevronDown size={14} />
                                            </>
                                          )}
                                        </button>
                                        <span className="text-[11px] text-gray-400">
                                          {step.phaseTitle}
                                        </span>
                                      </div>

                                      {/* Expanded Educational Content */}
                                      {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 text-xs">
                                          {/* Learning Objective */}
                                          <div className="rounded-lg bg-purple-50/50 border border-purple-100 p-3">
                                            <span className="font-bold text-purple-900 block mb-1">Learning Objective:</span>
                                            <p className="text-purple-800">{step.learningObjective}</p>
                                          </div>

                                          {/* Practical Exercise & Project Deliverable */}
                                          <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3">
                                              <span className="font-bold text-slate-900 block mb-1">Hands-On Practice Exercise:</span>
                                              <p className="text-slate-700">{step.practicalExercise}</p>
                                            </div>
                                            <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
                                              <span className="font-bold text-emerald-900 block mb-1">Portfolio Project Deliverable:</span>
                                              <p className="text-emerald-800">{step.projectDeliverable}</p>
                                            </div>
                                          </div>

                                          {/* Suggested Activities & Completion Criteria */}
                                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
                                            <span className="font-bold text-gray-800 block">Suggested Study Activities:</span>
                                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                              {step.suggestedActivities && step.suggestedActivities.map((act, aIdx) => (
                                                <li key={aIdx}>{act}</li>
                                              ))}
                                            </ul>
                                            <div className="pt-1 text-[11px] text-gray-500">
                                              <span className="font-semibold text-gray-700">Completion Criteria: </span>
                                              {step.completionCriteria}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* VIEW 2: INTERACTIVE SKILL DEPENDENCY GRAPH */}
                        {roadmapView === "graph" && (
                          <div className="space-y-4">
                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-3 text-xs bg-gray-50 border border-gray-100 p-3 rounded-xl">
                              <span className="font-bold text-gray-700">Graph Legend:</span>
                              <span className="flex items-center gap-1.5 text-emerald-700">
                                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                                Completed ({roadmap.completedSteps})
                              </span>
                              <span className="flex items-center gap-1.5 text-blue-700">
                                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                                In Progress
                              </span>
                              <span className="flex items-center gap-1.5 text-red-600">
                                <span className="h-3 w-3 rounded-full bg-red-400"></span>
                                Direct Job Requirement
                              </span>
                              <span className="flex items-center gap-1.5 text-amber-600">
                                <span className="h-3 w-3 rounded-full bg-amber-400"></span>
                                Discovered Prerequisite
                              </span>
                            </div>

                            {/* Nodes Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {roadmap.graph && roadmap.graph.nodes && roadmap.graph.nodes.map((node) => {
                                return (
                                  <div
                                    key={node.name}
                                    className={`rounded-xl border p-4 space-y-2 transition ${
                                      node.status === "completed"
                                        ? "border-emerald-300 bg-emerald-50/40"
                                        : node.status === "in_progress"
                                        ? "border-blue-300 bg-blue-50/40"
                                        : node.isJobRequirement
                                        ? "border-red-100 bg-white"
                                        : "border-amber-100 bg-amber-50/20"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-bold text-gray-900">{node.name}</span>
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                          node.status === "completed"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : node.status === "in_progress"
                                            ? "bg-blue-100 text-blue-800"
                                            : node.isJobRequirement
                                            ? "bg-red-50 text-red-700 border border-red-200"
                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                      >
                                        {node.status === "completed"
                                          ? "Completed"
                                          : node.status === "in_progress"
                                          ? "In Progress"
                                          : node.isJobRequirement
                                          ? "Target Job Skill"
                                          : "Prerequisite"}
                                      </span>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                      Category: <span className="font-semibold text-gray-700">{node.category}</span>
                                    </div>

                                    {/* Prerequisite & Unlocked relationships */}
                                    <div className="space-y-1 text-[11px] pt-1 border-t border-gray-100">
                                      {node.prerequisites && node.prerequisites.length > 0 && (
                                        <div className="text-gray-600">
                                          <span className="font-medium text-gray-700">Requires: </span>
                                          {node.prerequisites.join(", ")}
                                        </div>
                                      )}
                                      {node.dependents && node.dependents.length > 0 && (
                                        <div className="text-purple-700">
                                          <span className="font-medium">Unlocks: </span>
                                          {node.dependents.join(", ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Directed Edges List */}
                            {roadmap.graph && roadmap.graph.edges && roadmap.graph.edges.length > 0 && (
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
                                <span className="text-xs font-bold text-gray-700">Directed Prerequisite Dependencies:</span>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {roadmap.graph.edges.map((edge, eIdx) => (
                                    <span
                                      key={eIdx}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700 font-medium shadow-2xs"
                                    >
                                      <span className="font-semibold text-slate-800">{edge.from}</span>
                                      <ArrowRight size={12} className="text-purple-500" />
                                      <span className="font-semibold text-indigo-700">{edge.to}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {jobMatchResult.additionalResumeSkills.length > 0 && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-bold text-gray-900">Additional Resume Skills</h4>
                            <p className="mt-1 text-xs text-gray-500">
                              Skills on your resume not explicitly requested by this job description. (Does not affect match score)
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                            {jobMatchResult.additionalResumeSkills.length} skills
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {jobMatchResult.additionalResumeSkills.map((skill) => (
                            <span
                              key={skill.name}
                              className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-100"
                            >
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-Project Relevance */}
                    {projectRelevance && projectRelevance.length > 0 && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-bold text-gray-900">Project Relevance for This JD</h4>
                            <p className="mt-1 text-xs text-gray-500">
                              How well each project aligns with this specific job description. Job Value = 40% Strength + 60% Relevance.
                            </p>
                          </div>
                          <FolderGit2 size={18} className="text-purple-400 flex-shrink-0" />
                        </div>
                        <div className="space-y-3">
                          {[...projectRelevance]
                            .sort((a, b) => b.jobValue - a.jobValue)
                            .map((proj) => (
                              <div key={proj.title} className="rounded-xl border border-gray-200 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <h5 className="font-semibold text-gray-800 text-sm">{proj.title}</h5>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-gray-500">Relevance</span>
                                    <span
                                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                        proj.relevanceScore >= 70
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : proj.relevanceScore >= 40
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-red-50 text-red-600 border-red-200"
                                      }`}
                                    >
                                      {proj.relevanceScore}%
                                    </span>
                                    <span className="text-xs text-gray-500">Job Value</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                      {proj.jobValue}/100
                                    </span>
                                  </div>
                                </div>
                                {proj.matchedRequiredSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {proj.matchedRequiredSkills.map((s) => (
                                      <span key={s} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                                        <Check size={10} /> {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {proj.missingRequiredSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {proj.missingRequiredSkills.map((s) => (
                                      <span key={s} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-100">
                                        <X size={10} /> {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ResumePage;
