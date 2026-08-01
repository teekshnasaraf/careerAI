import { useEffect, useState } from "react";
import {
  Sparkles,
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Target,
  BookOpen,
  Wand2,
  FileText,
  Briefcase,
  Code2,
  GraduationCap,
  FolderGit2,
} from "lucide-react";

import {
  getLatestAnalysisApi,
  runResumeAnalysisApi,
  improveSectionApi,
  runSkillGapAnalysisApi,
} from "../../features/analysis/analysis.service";
import type { AnalysisData, AiSectionImprovement, AiSkillGapResult } from "../../types/analysis";
import axios from "axios";

const PRESET_ROLES = [
  "Full Stack Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "DevOps Engineer",
  "AI / ML Engineer",
  "Cybersecurity Analyst",
];

function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Section Improvement State (Context-Aware Rewrite)
  const [improvementSection, setImprovementSection] = useState<string>("Professional Summary");
  const [improvementInput, setImprovementInput] = useState<string>("");
  const [improving, setImproving] = useState(false);
  const [improvementResult, setImprovementResult] = useState<AiSectionImprovement | null>(null);
  const [copied, setCopied] = useState(false);

  // Skill Gap State (Role-Matching Roadmap)
  const [targetRoleInput, setTargetRoleInput] = useState<string>("Full Stack Engineer");
  const [generatingGap, setGeneratingGap] = useState(false);
  const [skillGapResult, setSkillGapResult] = useState<AiSkillGapResult | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getLatestAnalysisApi();
      if (res.success && res.data) {
        setAnalysis(res.data);
        if (res.data.targetRole) {
          setTargetRoleInput(res.data.targetRole);
        }
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
        if (res.data.skillGapAnalysis) {
          setSkillGapResult(res.data.skillGapAnalysis);
        }
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

  const handleRunSkillGap = async (selectedRole?: string) => {
    const roleToTest = (selectedRole || targetRoleInput).trim();
    if (!roleToTest) return;

    try {
      setGeneratingGap(true);
      setTargetRoleInput(roleToTest);
      const res = await runSkillGapAnalysisApi(roleToTest);
      if (res.success && res.data) {
        setAnalysis(res.data);
        if (res.data.skillGapAnalysis) {
          setSkillGapResult(res.data.skillGapAnalysis);
        }
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
        <p className="text-sm font-medium text-gray-500">Retrieving single source of truth AI resume evaluation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            AI Resume Analysis & Career Guidance
          </h1>
          <p className="mt-1 text-gray-500">
            Consolidated AI evaluation score gauges, keyword recommendations, context-aware section improver, and dynamic role matching.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
        >
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {analyzing ? "Re-Evaluating..." : "Analyze Again"}
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
          {/* Top Single Source of Truth Score Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Overall Resume Score</span>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-600">{analysis.resumeScore}/100</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  AI Single Source
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Calculated from your uploaded resume content</p>
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
              <p className="mt-2 text-xs text-gray-500">Based on structure, section clarity, and keyword coverage in your resume</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Missing Skills</span>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-amber-600">
                {skillGapResult?.missingSkills?.length || analysis.missingSkills?.length || 0} Recommended
              </div>
              <p className="mt-2 text-xs text-gray-500">Key tools to add for target role</p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-sm font-medium">Target Role Match</span>
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-4 text-3xl font-bold text-purple-600">
                {skillGapResult?.matchingScore || 75}%
              </div>
              <p className="mt-2 text-xs text-gray-500">{targetRoleInput}</p>
            </div>
          </div>

          {/* Section-Wise Scores & Evaluation */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Section-Wise Scores & Evaluation</h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Summary Section
                  </h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {analysis.sectionScores?.summaryScore || 75}/100
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {analysis.sectionAnalysis?.summary || "Summary review completed."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-purple-600" />
                    Technical Skills
                  </h3>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    {analysis.sectionScores?.skillsScore || 70}/100
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {analysis.sectionAnalysis?.skills || "Skills evaluated against benchmarks."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    Work Experience
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {analysis.sectionScores?.experienceScore || 65}/100
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {analysis.sectionAnalysis?.experience || "Experience section reviewed."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-amber-600" />
                    Projects & Portfolio
                  </h3>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    {analysis.sectionScores?.projectsScore || 80}/100
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {analysis.sectionAnalysis?.projects || "Projects evaluated."}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    Education
                  </h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {analysis.sectionScores?.educationScore || 85}/100
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {analysis.sectionAnalysis?.education || "Education background verified."}
                </p>
              </div>
            </div>
          </div>

          {/* Strengths, Weaknesses, Keywords & Action Verbs */}
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

            {/* Recommended Keywords */}
            <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Recommended ATS Keywords
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.recommendedKeywords?.map((kw) => (
                  <span key={kw} className="rounded-xl bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-100">
                    + {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Recommended Action Verbs */}
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Recommended Action Verbs
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.actionVerbs?.map((verb) => (
                  <span key={verb} className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                    {verb}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Context-Aware AI Section Rewriter Workbench */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Context-Aware AI Section Rewriter</h2>
                <p className="text-xs text-gray-500">Gemini uses your full resume text, target role, and ATS weaknesses to rewrite bullet points.</p>
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
                  {improving ? "Rewriting with AI..." : "Rewrite with AI"}
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
                      Enter text on the left and click "Rewrite with AI" to generate a context-aware improved version.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Role-Matching Skill Gap Analysis & Learning Roadmap */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Dynamic Role-Specific Skill Gap Analysis</h2>
                  <p className="text-xs text-gray-500">Select any target role to trigger dynamic Gemini AI matching against your resume skills.</p>
                </div>
              </div>
            </div>

            {/* Target Role Selector Pills */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700">Select Target Role:</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRunSkillGap(role)}
                    disabled={generatingGap}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
                      targetRoleInput.toLowerCase() === role.toLowerCase()
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-300"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {/* Custom Role Input */}
              <div className="flex items-center gap-3 pt-2 max-w-md">
                <input
                  type="text"
                  value={targetRoleInput}
                  onChange={(e) => setTargetRoleInput(e.target.value)}
                  placeholder="Custom Role (e.g. Data Engineer)"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />

                <button
                  onClick={() => handleRunSkillGap()}
                  disabled={generatingGap || !targetRoleInput.trim()}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 disabled:opacity-50 flex-shrink-0"
                >
                  {generatingGap ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                  Evaluate
                </button>
              </div>
            </div>

            {/* Roadmap Output */}
            {skillGapResult && (
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                    <span className="text-xs font-semibold text-purple-700">Role Match Rating</span>
                    <div className="text-2xl font-bold text-purple-900 mt-1">{skillGapResult.matchingScore}%</div>
                    <span className="text-[11px] text-purple-600 font-medium">{skillGapResult.targetRole}</span>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <span className="text-xs font-semibold text-amber-700">Missing Technologies</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skillGapResult.missingTechnologies && skillGapResult.missingTechnologies.length > 0 ? (
                        skillGapResult.missingTechnologies.map((tech) => (
                          <span key={tech} className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
                            {tech}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-medium text-emerald-700">All key tech matched!</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <span className="text-xs font-semibold text-blue-700">High Priority Skill Targets</span>
                    <div className="text-xs text-blue-900 font-medium mt-1">
                      {skillGapResult.prioritySkills && skillGapResult.prioritySkills.length > 0
                        ? skillGapResult.prioritySkills.slice(0, 2).join(", ")
                        : "Maintain current skill proficiency"}
                    </div>
                  </div>
                </div>

                {/* Recommended Projects */}
                {skillGapResult.recommendedProjects && skillGapResult.recommendedProjects.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <FolderGit2 className="h-5 w-5 text-purple-600" />
                      Recommended Portfolio Projects for {skillGapResult.targetRole}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {skillGapResult.recommendedProjects.map((proj, pIdx) => (
                        <div key={pIdx} className="rounded-xl border border-gray-200 p-4 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 text-sm">{proj.title}</h4>
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {proj.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{proj.description}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.technologies?.map((tech) => (
                              <span key={tech} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personalized Learning Roadmap Timeline */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Role-Specific Learning Roadmap
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    {skillGapResult.learningRoadmap?.map((item, rIdx) => (
                      <div key={rIdx} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            {item.step}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {item.estimatedHours} hrs
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">{item.topic}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.details}</p>
                        {item.weeklyPlan && item.weeklyPlan.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[11px] font-semibold text-gray-500">Action Plan:</span>
                            <ul className="list-disc pl-4 text-[11px] text-gray-600 space-y-0.5">
                              {item.weeklyPlan.map((wp, wpIdx) => (
                                <li key={wpIdx}>{wp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
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

export default AnalysisPage;
