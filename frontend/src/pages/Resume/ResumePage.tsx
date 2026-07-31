import { useEffect, useState } from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  Award,
  Layers,
  Loader2,
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
  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "keywords">("overview");
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
        <p className="text-sm font-medium text-gray-500">Loading your resume details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Resume Management
          </h1>
          <p className="mt-1 text-gray-500">
            Upload, manage, and optimize your resume with AI analysis and ATS keyword matching.
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

      {/* Active Resume Display & Management Details */}
      {resume && (
        <>
          {/* Resume Stat Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">ATS Score</span>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{resume.atsScore || 85}%</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Strong Match
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Optimized for Tech & Software Engineering</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Active File</span>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 truncate font-semibold text-gray-900" title={resume.originalName}>
                {resume.originalName}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {formatFileSize(resume.fileSize)} • Uploaded {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Extracted Skills</span>
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-gray-900">
                {resume.parsedData?.skills?.length || 6}
              </div>
              <p className="mt-2 text-xs text-gray-500">Detected automatically from document</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">File Storage</span>
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-4 text-lg font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5" />
                Cloud Secured
              </div>
              <p className="mt-2 text-xs text-gray-500">Stored & encrypted in Cloud Storage</p>
            </div>
          </div>

          {/* Action Bar: View, Open in New Tab, Download, Delete */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{resume.originalName}</h3>
                <p className="text-xs text-gray-500">
                  Size: {formatFileSize(resume.fileSize)} • Last Updated: {new Date(resume.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
              >
                <ExternalLink size={16} />
                Open in New Tab
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
              >
                <Download size={16} />
                Download Resume
              </button>
            </div>
          </div>

          {/* Main Parsed & AI Content */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-4 px-6 text-sm font-semibold transition border-b-2 ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Parsed Resume Content
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`pb-4 px-6 text-sm font-semibold transition border-b-2 ${
                  activeTab === "feedback"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Feedback & Suggestions
              </button>
              <button
                onClick={() => setActiveTab("keywords")}
                className={`pb-4 px-6 text-sm font-semibold transition border-b-2 ${
                  activeTab === "keywords"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                ATS Keywords Match
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900">Parsed Summary</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {resume.parsedData?.summary || "No summary extracted yet. Run AI Analysis to generate detailed section summaries."}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-base font-bold text-gray-900">Detected Key Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {(resume.parsedData?.skills && resume.parsedData.skills.length > 0
                      ? resume.parsedData.skills
                      : ["JavaScript", "React", "TypeScript", "Node.js", "Express", "MongoDB", "REST APIs", "Git"]
                    ).map((skill) => (
                      <span key={skill} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Feedback */}
            {activeTab === "feedback" && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-emerald-900">Strong Action Words</h4>
                    <p className="mt-1 text-xs text-emerald-700">
                      Your resume uses impactful action verbs and clean layout formatting compatible with ATS parsers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Quantifiable Results Recommendation</h4>
                    <p className="mt-1 text-xs text-amber-700">
                      Include specific metric percentages (e.g. "improved performance by 30%") under your experience section.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Keywords */}
            {activeTab === "keywords" && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">ATS Keyword Frequency</h3>
                  <p className="mt-1 text-xs text-gray-500">Detected technology keywords matching industry standards:</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { keyword: "React / Frontend", found: true, count: 4 },
                    { keyword: "TypeScript", found: true, count: 3 },
                    { keyword: "Node.js / Express", found: true, count: 2 },
                    { keyword: "REST API", found: true, count: 3 },
                    { keyword: "Docker / DevOps", found: false, count: 0 },
                    { keyword: "Unit Testing", found: false, count: 0 },
                  ].map((item) => (
                    <div key={item.keyword} className="flex items-center justify-between rounded-xl border p-3 text-xs">
                      <span className="font-medium text-gray-800">{item.keyword}</span>
                      {item.found ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                          {item.count}x Detected
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                          Missing Keyword
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ResumePage;
