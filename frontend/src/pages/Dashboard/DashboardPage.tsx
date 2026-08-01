import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Award,
  BarChart3,
  Video,
  Target,
  ArrowRight,
  Upload,
  Sparkles,
  Loader2,
  Calendar,
} from "lucide-react";
import { getDashboardStatsApi } from "../../features/dashboard/dashboard.service";
import type { DashboardStatsData } from "../../features/dashboard/dashboard.service";

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStatsApi();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading your live dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Career Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Real-time snapshot of your resume evaluation, ATS readiness score, target role alignment, and prep tools.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Resume Status */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Resume Uploaded</span>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {stats?.resumeUploaded ? (
              <span className="text-emerald-600">Uploaded</span>
            ) : (
              <span className="text-amber-600">Not Uploaded</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {stats?.originalName ? stats.originalName : "No resume on file"}
          </p>
        </div>

        {/* ATS Readiness Score */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">ATS Readiness</span>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats?.atsScore || 0}/100</span>
          </div>
          <p className="text-xs text-gray-500">Matches your uploaded resume content and parsing results</p>
        </div>

        {/* Overall Resume Score */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Overall Quality</span>
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">{stats?.resumeScore || 0}/100</span>
          </div>
          <p className="text-xs text-gray-500">Recruiter appeal & format rating</p>
        </div>

        {/* Target Role & Skill Gaps */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/60 to-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-800">Target Role</span>
            <Target className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-900 truncate">
            {stats?.targetRole || "Full Stack Engineer"}
          </div>
          <p className="text-xs text-purple-700 font-medium">
            {stats?.skillGapCount || 0} missing skills identified
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => navigate("/resume")}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-5 text-left transition hover:bg-blue-50 hover:border-blue-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-sm block">Upload / Manage Resume</span>
                <span className="text-xs text-gray-500">Upload PDF/DOCX or view parsed tabs</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            onClick={() => navigate("/analysis")}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-5 text-left transition hover:bg-purple-50 hover:border-purple-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-sm block">AI Resume Analysis</span>
                <span className="text-xs text-gray-500">Review score gauges & skill gap roadmaps</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
          </button>

          <button
            onClick={() => navigate("/analysis")}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-5 text-left transition hover:bg-emerald-50 hover:border-emerald-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-sm block">Interview Prep</span>
                <span className="text-xs text-gray-500">Practice role questions & AI guidance</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* Upload Details Banner */}
      {stats?.resumeUploaded && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900">Active Resume File</p>
              <p className="text-sm font-bold text-blue-950">{stats.originalName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => stats.fileUrl && window.open(stats.fileUrl, "_blank")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Open File
            </button>
            <button
              onClick={() => navigate("/resume")}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 transition"
            >
              Replace / Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;