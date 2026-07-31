import { useEffect, useState } from "react";
import {
  Sparkles,
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Target,
  BookOpen,
  ArrowRight,
  Wand2,
  FileText,
} from "lucide-react";

import {
  getLatestAnalysisApi,
  runResumeAnalysisApi,
  improveSectionApi,
  runSkillGapAnalysisApi,
} from "../../features/analysis/analysis.service";
import type { AnalysisData, AiSectionImprovement, AiSkillGapResult } from "../../types/analysis";
import axios from "axios";

function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Section Improvement State (Phase 6)
  const [improvementSection, setImprovementSection] = useState<string>("Professional Summary");
  const [improvementInput, setImprovementInput] = useState<string>("");
  const [improving, setImproving] = useState(false);
  const [improvementResult, setImprovementResult] = useState<AiSectionImprovement | null>(null);
  const [copied, setCopied] = useState(false);

  // Skill Gap State (Phase 7)
  const [targetRoleInput, setTargetRoleInput] = useState<string>("Senior Full Stack Engineer");
  const [generatingGap, setGeneratingGap] = useState(false);
  const [skillGapResult, setSkillGapResult] = useState<AiSkillGapResult | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getLatestAnalysisApi();
      if (res.success && res.data) {
        setAnalysis(res.data);
        if (res.data.skillGapAnalysis) {
          setSkillGapResult(res.data.skillGapAnalysis);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load analysis:", err);
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || "Failed to fetch resume analysis");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setErrorMsg(null);
      const res = await runResumeAnalysisApi();
      if (res.success && res.data) {
        setAnalysis(res.data);
      }
    } catch (err: unknown) {
      console.error("Error running analysis:", err);
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.message || "Failed to analyze resume. Make sure a resume is uploaded first.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImproveSection = async () => {
    if (!improvementInput.trim()) return;
    try {
      setImproving(true);
      const res = await improveSectionApi(improvementSection, improvementInput);
      if (res.success) {
        setImprovementResult(res.data);
      }
    } catch (err) {
      console.error("Error improving section:", err);
      alert("Failed to improve section with AI. Please try again.");
    } finally {
      setImproving(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSkillGap = async () => {
    if (!targetRoleInput.trim()) return;
    try {
      setGeneratingGap(true);
      const res = await runSkillGapAnalysisApi(targetRoleInput);
      if (res.success) {
        setSkillGapResult(res.data);
      }
    } catch (err) {
      console.error("Error running skill gap analysis:", err);
      alert("Failed to generate skill gap roadmap.");
    } finally {
      setGeneratingGap(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Retrieving AI resume review & evaluation metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            AI Resume Analysis & Improvement
          </h1>
          <p className="mt-1 text-gray-500">
            Gemini AI-powered scores, section evaluations, section re-writer workbench, and target role skill gap roadmaps.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
        >
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {analyzing ? "Running Gemini Review..." : "Analyze Again"}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-100">
          {errorMsg}
        </div>
      )}

      {/* Main Analysis Display */}
      {analysis ? (
        <>
          {/* Top Score Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Overall Resume Score</span>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-600">{analysis.resumeScore}/100</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  AI Evaluated
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Overall content quality and recruiter appeal</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">ATS Match Score</span>
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-emerald-600">{analysis.atsScore}/100</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  ATS Ready
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Structure & keyword parser compatibility</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Missing Skills</span>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-amber-600">
                {analysis.missingSkills?.length || 0} Recommended
              </div>
              <p className="mt-2 text-xs text-gray-500">Key tools & keywords to add</p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Target Role Match</span>
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-purple-600">
                {skillGapResult?.matchingScore || 75}%
              </div>
              <p className="mt-2 text-xs text-gray-500">{skillGapResult?.targetRole || "Full Stack Engineer"}</p>
            </div>
          </div>

          {/* Section-Wise Analysis Grid */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Section-Wise Evaluation</h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Professional Summary
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {analysis.sectionAnalysis?.summary || "Summary review completed."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Technical Skills
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {analysis.sectionAnalysis?.skills || "Skills evaluated against benchmarks."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <BriefcaseIcon className="h-4 w-4 text-emerald-600" />
                  Work Experience
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {analysis.sectionAnalysis?.experience || "Experience section reviewed."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <FolderGit2Icon className="h-4 w-4 text-amber-600" />
                  Projects & Portfolio
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {analysis.sectionAnalysis?.projects || "Projects evaluated."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <GraduationIcon className="h-4 w-4 text-indigo-600" />
                  Education
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {analysis.sectionAnalysis?.education || "Education background verified."}
                </p>
              </div>
            </div>
          </div>

          {/* Strengths, Weaknesses, Suggestions & Missing Skills Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Resume Strengths
              </h3>
              <ul className="space-y-2.5">
                {analysis.strengths?.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Areas to Improve (Weaknesses)
              </h3>
              <ul className="space-y-2.5">
                {analysis.weaknesses?.map((weak, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                AI Optimization Suggestions
              </h3>
              <ul className="space-y-2.5">
                {analysis.suggestions?.map((sug, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing Skills */}
            <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Recommended ATS Keywords
              </h3>
              <div className="flex flex-wrap gap-2 pt-2">
                {analysis.missingSkills?.map((skill) => (
                  <span key={skill} className="rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-100">
                    + {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Phase 6 – AI Section Improvement Workbench */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Phase 6 – AI Section Rewriter Workbench</h2>
                <p className="text-xs text-gray-500">Select any resume section, paste your draft, and let AI generate punchy, high-impact phrasing.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Input Control */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Section to Improve</label>
                  <select
                    value={improvementSection}
                    onChange={(e) => setImprovementSection(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Professional Summary">Professional Summary</option>
                    <option value="Work Experience Bullet Point">Work Experience Bullet Point</option>
                    <option value="Project Description">Project Description</option>
                    <option value="Technical Skills List">Technical Skills List</option>
                    <option value="Key Achievement">Key Achievement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Draft Section Text</label>
                  <textarea
                    rows={4}
                    value={improvementInput}
                    onChange={(e) => setImprovementInput(e.target.value)}
                    placeholder="Paste your existing section bullet point or summary here..."
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleImproveSection}
                  disabled={improving || !improvementInput.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {improving ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {improving ? "Improving with AI..." : "Rewrite & Improve with AI"}
                </button>
              </div>

              {/* Output Display */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">AI Improved Version</span>
                    {improvementResult && (
                      <button
                        onClick={() => handleCopyText(improvementResult.improvedContent)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied ? "Copied!" : "Copy Text"}
                      </button>
                    )}
                  </div>

                  {improvementResult ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-800 leading-relaxed font-medium bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        {improvementResult.improvedContent}
                      </p>

                      {improvementResult.keyChanges && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-gray-500">Key Enhancements Made:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {improvementResult.keyChanges.map((change, cIdx) => (
                              <span key={cIdx} className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                ✓ {change}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic pt-8 text-center">
                      Enter text on the left and click "Rewrite & Improve with AI" to generate an optimized version.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Phase 7 – Skill Gap Analysis & Learning Roadmap */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Phase 7 – Skill Gap Analysis & Roadmap</h2>
                  <p className="text-xs text-gray-500">Compare your resume against target roles to get a step-by-step learning roadmap.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={targetRoleInput}
                  onChange={(e) => setTargetRoleInput(e.target.value)}
                  placeholder="Target Role (e.g. Senior Full Stack Engineer)"
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />

                <button
                  onClick={handleRunSkillGap}
                  disabled={generatingGap}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {generatingGap ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                  Compare & Map
                </button>
              </div>
            </div>

            {/* Roadmap Output */}
            {skillGapResult && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                    <span className="text-xs font-semibold text-purple-700">Role Match Rating</span>
                    <div className="text-2xl font-bold text-purple-900 mt-1">{skillGapResult.matchingScore}%</div>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <span className="text-xs font-semibold text-amber-700">Missing Key Technologies</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skillGapResult.missingTechnologies?.map((tech) => (
                        <span key={tech} className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 border">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <span className="text-xs font-semibold text-blue-700">High Priority Skill Targets</span>
                    <div className="text-xs text-blue-900 font-medium mt-1">
                      {skillGapResult.learningPriority?.slice(0, 2).join(", ")}
                    </div>
                  </div>
                </div>

                {/* Personalized Learning Roadmap Timeline */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Personalized Learning Roadmap
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    {skillGapResult.learningRoadmap?.map((item, rIdx) => (
                      <div key={rIdx} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            {item.step}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">{item.topic}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.details}</p>
                        <div className="pt-2 text-[11px] text-gray-500 font-medium border-t border-gray-100">
                          Resource: <span className="text-blue-600">{item.recommendedResource}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FileText className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Resume Uploaded Yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Please upload your resume in the Resume section first so our AI engine can generate a full analysis.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper Icon components for clean UI rendering
function BriefcaseIcon(props: any) {
  return <ArrowRight {...props} />;
}
function FolderGit2Icon(props: any) {
  return <ArrowRight {...props} />;
}
function GraduationIcon(props: any) {
  return <ArrowRight {...props} />;
}

export default AnalysisPage;
