import { useEffect, useState } from "react";
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
} from "lucide-react";

import ResumeUploadCard, { formatFileSize } from "../../components/resume/ResumeUploadCard";
import { getLatestResumeApi, deleteResumeApi } from "../../features/resume/resume.service";
import { matchJobDescriptionApi, type JobMatchResult } from "../../features/jobs/jobs.service";
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
  }, []);

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
                <h3 className="text-base font-bold text-gray-900 mb-4">Extracted Projects</h3>
                {resume.parsedData?.projects && resume.parsedData.projects.length > 0 ? (
                  <div className="space-y-4">
                    {resume.parsedData.projects.map((proj, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 p-5 space-y-2">
                        <h4 className="font-bold text-gray-900 text-base">{proj.title}</h4>
                        {proj.description && (
                          <p className="text-xs text-gray-600 leading-relaxed">{proj.description}</p>
                        )}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {proj.technologies.map((tech) => (
                              <span key={tech} className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        {proj.links && proj.links.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {proj.links.map((link, linkIdx) => (
                              <a
                                key={linkIdx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100 hover:bg-blue-100 transition"
                              >
                                <ExternalLink size={11} />
                                {link.replace(/^https?:\/\//, "").slice(0, 45)}{link.length > 50 ? "…" : ""}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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

                  <div className="flex justify-end">
                    <button
                      onClick={handleMatchJob}
                      disabled={matchingJob}
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
                  </div>
                </div>

                {/* Match Results Display */}
                {jobMatchResult && (
                  <div className="space-y-6">
                    {/* Score Overview */}
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6 shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Match Score</span>
                        <div className="mt-4 flex items-baseline gap-2">
                          {jobMatchResult.overallScore !== null ? (
                            <>
                              <span className="text-4xl font-extrabold text-blue-600">{jobMatchResult.overallScore}%</span>
                              <span
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
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
                            <span className="text-xl font-bold text-gray-400">No Score</span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {jobMatchResult.scoreExplanation || "Weighted by Required (1.0), Preferred (0.5), Unspecified (0.75)"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required Skills</span>
                        <div className="mt-4 flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-emerald-600">{jobMatchResult.matchedRequired.length}</span>
                          <span className="text-sm font-semibold text-gray-400">matched</span>
                          <span className="text-3xl font-bold text-red-500 ml-2">{jobMatchResult.missingRequired.length}</span>
                          <span className="text-sm font-semibold text-gray-400">missing</span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Weight: 1.0 each</p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferred Skills</span>
                        <div className="mt-4 flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-blue-600">{jobMatchResult.matchedPreferred.length}</span>
                          <span className="text-sm font-semibold text-gray-400">matched</span>
                          <span className="text-3xl font-bold text-gray-500 ml-2">{jobMatchResult.missingPreferred.length}</span>
                          <span className="text-sm font-semibold text-gray-400">missing</span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Weight: 0.5 each</p>
                      </div>
                    </div>

                    {/* Matched & Missing Required Skills */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                      <h4 className="text-base font-bold text-gray-900">Required Skills Breakdown</h4>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                            <Check size={16} />
                            <span>Matched Required Skills ({jobMatchResult.matchedRequired.length})</span>
                          </div>
                          {jobMatchResult.matchedRequired.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {jobMatchResult.matchedRequired.map((skill) => (
                                <span
                                  key={skill.name}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"
                                  title={skill.resumeEvidence ? `Found ${skill.resumeEvidence.occurrences}x in: ${skill.resumeEvidence.sections.join(", ")}` : undefined}
                                >
                                  <Check size={12} className="text-emerald-600" />
                                  {skill.name}
                                  {skill.resumeEvidence && (
                                    <span className="ml-1 rounded bg-emerald-200/60 px-1 py-0.2 text-[10px] text-emerald-900">
                                      {skill.resumeEvidence.occurrences}x
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">None matched yet.</p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                            <X size={16} />
                            <span>Missing Required Skills ({jobMatchResult.missingRequired.length})</span>
                          </div>
                          {jobMatchResult.missingRequired.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {jobMatchResult.missingRequired.map((skill) => (
                                <span
                                  key={skill.name}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200"
                                >
                                  <X size={12} className="text-red-500" />
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-600 font-medium">All required skills met!</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preferred Skills Breakdown */}
                    {(jobMatchResult.matchedPreferred.length > 0 || jobMatchResult.missingPreferred.length > 0) && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                        <h4 className="text-base font-bold text-gray-900">Preferred Qualifications Breakdown</h4>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                              <Check size={16} />
                              <span>Matched Preferred ({jobMatchResult.matchedPreferred.length})</span>
                            </div>
                            {jobMatchResult.matchedPreferred.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {jobMatchResult.matchedPreferred.map((skill) => (
                                  <span
                                    key={skill.name}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200"
                                    title={skill.resumeEvidence ? `Found ${skill.resumeEvidence.occurrences}x in: ${skill.resumeEvidence.sections.join(", ")}` : undefined}
                                  >
                                    <Check size={12} className="text-blue-600" />
                                    {skill.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">None matched.</p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                              <span>Missing Preferred ({jobMatchResult.missingPreferred.length})</span>
                            </div>
                            {jobMatchResult.missingPreferred.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {jobMatchResult.missingPreferred.map((skill) => (
                                  <span
                                    key={skill.name}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200"
                                  >
                                    {skill.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-blue-600 font-medium">All preferred skills met!</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Resume Skills */}
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
