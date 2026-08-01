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
} from "lucide-react";

import ResumeUploadCard, { formatFileSize } from "../../components/resume/ResumeUploadCard";
import { getLatestResumeApi, deleteResumeApi } from "../../features/resume/resume.service";
import type { ResumeData } from "../../types/resume";
import axios from "axios";

function ResumePage() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ats_insights" | "overview" | "experience" | "education" | "projects">("ats_insights");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {resume.parsedData?.summary || "No professional summary header detected in your resume text."}
                  </p>
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
                        <p className="text-xs text-gray-500">{edu.institution}</p>
                        <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                          Year: {edu.year}
                        </span>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No Project entries detected in document text.</p>
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
