import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckCircle2,
  Award,
  Play,
  Loader2,
  Send,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

import {
  getInterviewStatsApi,
  getActiveInterviewSessionApi,
  startInterviewSessionApi,
  submitQuestionAnswerApi,
  finishInterviewSessionApi,
} from "../../features/interview/interview.service";
import type {
  InterviewStatsData,
  InterviewSessionData,
  EvaluationEntry,
  QuestionEntry,
} from "../../features/interview/interview.service";
import {
  getAllUserProjectEvidenceApi,
  type ProjectEvidenceData,
} from "../../features/projectEvidence/projectEvidence.service";

const MODES = [
  "Adaptive AI Technical Interview",
  "Mixed Interview",
  "Resume Based Interview",
  "Technical Interview",
  "System Design",
  "HR Interview",
  "Behavioural Interview",
];

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Netflix",
  "Apple",
  "Stripe",
  "Uber",
  "Startup",
];

const ROLES = [
  "Full Stack Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "DevOps & Cloud Engineer",
  "AI / ML Engineer",
  "Cybersecurity Analyst",
];

function InterviewPage() {
  const location = useLocation();
  const [stats, setStats] = useState<InterviewStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup Form State
  const [selectedMode, setSelectedMode] = useState("Adaptive AI Technical Interview");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Adaptive AI");
  const [selectedLength, setSelectedLength] = useState(5);
  const [selectedCompany, setSelectedCompany] = useState("Google");
  const [selectedRole, setSelectedRole] = useState("Full Stack Engineer");
  const [jobDescriptionInput, setJobDescriptionInput] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [userProjects, setUserProjects] = useState<ProjectEvidenceData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Active Session State
  const [activeSession, setActiveSession] = useState<InterviewSessionData | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswerInput, setUserAnswerInput] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationEntry | null>(null);
  const [showBetterAnswer, setShowBetterAnswer] = useState(false);
  const [activeResumeBanner, setActiveResumeBanner] = useState<InterviewSessionData | null>(null);

  const fetchStatsAndActive = async () => {
    try {
      setLoading(true);
      const [statsRes, activeRes, projectsRes] = await Promise.all([
        getInterviewStatsApi(),
        getActiveInterviewSessionApi(),
        getAllUserProjectEvidenceApi().catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (activeRes.success && activeRes.data) {
        setActiveResumeBanner(activeRes.data);
      }
      if (projectsRes.success && projectsRes.data) {
        setUserProjects(projectsRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch interview stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndActive();
    if (location.state && (location.state as any).projectEvidenceId) {
      setSelectedProjectId((location.state as any).projectEvidenceId);
    }
    if (location.state && (location.state as any).targetSkill) {
      const skill = (location.state as any).targetSkill;
      if ((location.state as any).targetRole) {
        setSelectedRole((location.state as any).targetRole);
      }
      setJobDescriptionInput(`Required Skill: ${skill}\nTarget Proficiency: Practical Application & System Architecture`);
    }
  }, [location.state]);

  const resumeExistingSession = (session: InterviewSessionData) => {
    setActiveSession(session);
    setActiveResumeBanner(null);
    const answeredCount = session.responses.length;
    const targetIdx = Math.min(answeredCount, session.questions.length - 1);
    setCurrentQuestionIdx(targetIdx);
    setUserAnswerInput("");
    setShowBetterAnswer(false);
    const activeQ = session.questions[targetIdx];
    const matchingEval = session.responses.find(
      (r) => (activeQ?.questionId && r.questionId === activeQ.questionId) || r.questionText === activeQ?.text
    );
    setLatestEvaluation(matchingEval || null);
  };

  const handleStartSession = async () => {
    try {
      setStartingSession(true);
      const isAdaptive =
        selectedMode.includes("Adaptive") || selectedDifficulty === "Adaptive AI";

      const res = await startInterviewSessionApi({
        mode: selectedMode,
        difficulty: selectedDifficulty,
        length: selectedLength,
        targetCompany: selectedCompany,
        targetRole: selectedRole,
        jobDescription: jobDescriptionInput.trim() || undefined,
        isAdaptive,
        projectEvidenceId: selectedProjectId || undefined,
      });

      if (res.success && res.data) {
        setActiveSession(res.data);
        setActiveResumeBanner(null);
        setCurrentQuestionIdx(0);
        setUserAnswerInput("");
        setLatestEvaluation(null);
        setShowBetterAnswer(false);
      }
    } catch (err) {
      console.error("Error starting session:", err);
      alert("Failed to start mock interview session.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswerInput.trim() || submittingAnswer) return;

    const currentQ: QuestionEntry | undefined = activeSession.questions[currentQuestionIdx];
    if (!currentQ) return;

    try {
      setSubmittingAnswer(true);
      setLatestEvaluation(null);
      setShowBetterAnswer(false);
      const res = await submitQuestionAnswerApi({
        sessionId: activeSession._id,
        questionId: currentQ.questionId,
        questionText: currentQ.text,
        userAnswer: userAnswerInput,
      });

      if (res.success && res.data) {
        setLatestEvaluation(res.data.evaluation);
        setShowBetterAnswer(false);

        if (res.data.session) {
          setActiveSession(res.data.session);
        } else if (res.data.nextQuestion) {
          // Adaptive: next question was added to the questions list
          setActiveSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              questions: [...prev.questions, res.data.nextQuestion!],
              responses: [...prev.responses, res.data.evaluation],
            };
          });
        }
      }
    } catch (err: any) {
      console.error("Error submitting answer:", err);
      alert(err?.response?.data?.message || "Failed to evaluate answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (!activeSession) return;

    if (currentQuestionIdx + 1 < activeSession.questions.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setUserAnswerInput("");
      setLatestEvaluation(null);
      setShowBetterAnswer(false);
    } else {
      handleFinishSession();
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    try {
      const res = await finishInterviewSessionApi(activeSession._id);
      if (res.success && res.data) {
        setActiveSession(res.data);
        fetchStatsAndActive();
      }
    } catch (err) {
      console.error("Error finishing session:", err);
    }
  };

  const currentQuestion = activeSession?.questions[currentQuestionIdx];
  const isEvalForCurrentQuestion = Boolean(
    latestEvaluation &&
      currentQuestion &&
      !submittingAnswer &&
      ((currentQuestion.questionId && latestEvaluation.questionId === currentQuestion.questionId) ||
        (!latestEvaluation.questionId && latestEvaluation.questionText === currentQuestion.text))
  );

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Hard":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Easy":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading AI interview simulator & user statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            Phase 3 Engine
          </span>
          <span className="text-xs font-semibold text-gray-500">Adaptive AI Technical Interview</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Adaptive AI Mock Interview</h1>
        <p className="mt-1 text-gray-500">
          Personalized technical interviews that dynamically adapt difficulty, probe gaps with follow-ups, and evaluate your responses against a 5-dimension engineering rubric.
        </p>
      </div>

      {/* In-Progress Session Recovery Banner */}
      {activeResumeBanner && !activeSession && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <RotateCcw className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Active Interview in Progress ({activeResumeBanner.targetRole} @ {activeResumeBanner.targetCompany})
                </h3>
                <p className="text-xs text-gray-500">
                  {activeResumeBanner.responses.length} of {activeResumeBanner.length} questions completed • Current Difficulty: {activeResumeBanner.currentDifficulty || activeResumeBanner.difficulty}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => resumeExistingSession(activeResumeBanner)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
              >
                Resume Interview →
              </button>
              <button
                onClick={() => setActiveResumeBanner(null)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solved</span>
          <div className="text-2xl font-extrabold text-gray-900">{stats?.questionsSolved || 0}</div>
          <p className="text-[11px] text-gray-400">Total Questions</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-extrabold text-blue-600">{stats?.mockInterviewsCompleted || 0}</div>
          <p className="text-[11px] text-gray-400">Mock Sessions</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Avg Score</span>
          <div className="text-2xl font-extrabold text-emerald-600">{stats?.averageInterviewScore || 0}%</div>
          <p className="text-[11px] text-gray-400">Rubric Rating</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Confidence</span>
          <div className="text-lg font-bold text-purple-900">{stats?.confidenceLevel || "Building"}</div>
          <p className="text-[11px] text-gray-400">AI Assessed</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm space-y-2 col-span-2">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Focus Areas</span>
          <div className="text-xs font-medium text-gray-800 truncate">
            <span className="text-red-600 font-bold">Weakest:</span> {stats?.weakestTopic || "System Architecture"}
          </div>
          <div className="text-xs font-medium text-gray-800 truncate">
            <span className="text-emerald-600 font-bold">Strongest:</span> {stats?.strongestTopic || "Frontend Frameworks"}
          </div>
        </div>
      </div>

      {/* Active Session Workbench OR Session Setup Controls */}
      {activeSession ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          {/* Top Session Progress Bar & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Question {currentQuestionIdx + 1} of {activeSession.length}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {activeSession.targetCompany} • {activeSession.targetRole}
              </span>
              {activeSession.isAdaptive && (
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 flex items-center gap-1 border border-purple-200">
                  <Zap size={12} /> Adaptive State Machine Active
                </span>
              )}
            </div>

            <button
              onClick={() => setActiveSession(null)}
              className="text-xs font-semibold text-red-600 hover:underline self-end sm:self-auto"
            >
              Exit Interview
            </button>
          </div>

          {/* Current Question Display */}
          {currentQuestion && activeSession.status === "in_progress" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50/50 p-5 border border-blue-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                      {currentQuestion.category || "Technical"}
                    </span>
                    {currentQuestion.skill && (
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900 border border-blue-200 flex items-center gap-1">
                        <Target size={12} /> Assessing: {currentQuestion.skill}
                      </span>
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold border ${getDifficultyBadge(
                        currentQuestion.difficulty || activeSession.currentDifficulty || "Medium"
                      )}`}
                    >
                      {currentQuestion.difficulty || activeSession.currentDifficulty || "Medium"} Difficulty
                    </span>
                  </div>

                  {currentQuestion.isFollowup ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Sparkles size={12} /> Follow-Up Clarification
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      Core Topic Question
                    </span>
                  )}
                </div>

                {currentQuestion.followupReason && (
                  <div className="rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 border border-amber-200 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <span className="font-bold">Interviewer Rationale: </span>
                      {currentQuestion.followupReason}
                    </div>
                  </div>
                )}

                {activeSession.projectContext && (
                  <div className="rounded-lg bg-purple-50/80 p-3 text-xs text-purple-900 border border-purple-200 flex items-start gap-2.5">
                    <FolderGit2 size={15} className="mt-0.5 shrink-0 text-purple-600" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">Project Grounded:</span>
                        <span className="font-semibold text-purple-950">{activeSession.projectContext.projectTitle}</span>
                        <a
                          href={activeSession.projectContext.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-700 hover:underline"
                        >
                          <ExternalLink size={10} />
                          {activeSession.projectContext.repositoryUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                      {currentQuestion.repositoryFinding && (
                        <div className="text-[11px] text-purple-800">
                          <span className="font-semibold">Code Motivation: </span>
                          {currentQuestion.repositoryFinding}
                          {currentQuestion.fileReference && (
                            <span className="ml-1 font-mono text-[10px] bg-purple-100 px-1 py-0.5 rounded">
                              {currentQuestion.fileReference}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {currentQuestion.text}
                </h3>

                {currentQuestion.resumeReference && (
                  <p className="text-xs text-purple-700 font-medium">
                    Resume Context: {currentQuestion.resumeReference}
                  </p>
                )}
              </div>

              {/* User Answer Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Your Engineering Response
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Evaluated across: Correctness, Accuracy, Depth, Practicality & Communication
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={userAnswerInput}
                  onChange={(e) => setUserAnswerInput(e.target.value)}
                  placeholder="Explain your approach, system architecture, syntax, and real-world trade-offs..."
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

                {/* Submission Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={submittingAnswer || !userAnswerInput.trim()}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingAnswer ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submittingAnswer ? "Evaluating Answer against 5-Dimension Rubric..." : "Submit Answer to Evaluator"}
                  </button>

                  {isEvalForCurrentQuestion && (
                    <button
                      onClick={handleNextQuestion}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
                    >
                      <span>
                        {currentQuestionIdx + 1 < activeSession.length ? "Continue to Next Question" : "Finish & View Report"}
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                {/* Submitting progress banner */}
                {submittingAnswer && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-center justify-center gap-3 text-xs font-semibold text-blue-900 mt-4 animate-pulse">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Analyzing technical response against grounded engineering rubric...</span>
                  </div>
                )}

                {/* Answer Evaluation Feedback Panel */}
                {isEvalForCurrentQuestion && latestEvaluation && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 space-y-5 mt-6 animate-fadeIn">
                    {/* Abstention Transparency Notice */}
                    {latestEvaluation.score === 0 && (
                      <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold block">Abstention / Incomplete Technical Knowledge Demonstrated</span>
                          <span className="text-[11px] text-amber-800 leading-relaxed">
                            {latestEvaluation.feedback || "0% awarded across rubric dimensions. The candidate did not demonstrate required knowledge for this topic."}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h4 className="font-bold text-emerald-950 text-sm">
                          5-Dimension Engineering Rubric Evaluation
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Overall Score:</span>
                        <span className={`rounded-lg px-3 py-1 text-sm font-extrabold text-white shadow-sm ${
                          latestEvaluation.score >= 70 ? "bg-emerald-600" : latestEvaluation.score >= 40 ? "bg-amber-600" : "bg-red-600"
                        }`}>
                          {latestEvaluation.score}%
                        </span>
                      </div>
                    </div>

                  {/* 5-Dimension Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-lg bg-white p-3 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Correctness (30%)</span>
                      <div className="text-base font-extrabold text-emerald-700">
                        {latestEvaluation.technicalCorrectness}%
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-3 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Accuracy (20%)</span>
                      <div className="text-base font-extrabold text-blue-700">
                        {latestEvaluation.accuracy}%
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-3 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Depth (20%)</span>
                      <div className="text-base font-extrabold text-purple-700">
                        {latestEvaluation.depth}%
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-3 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Practical (15%)</span>
                      <div className="text-base font-extrabold text-amber-700">
                        {latestEvaluation.practicalApplication || 75}%
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-3 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Clarity (15%)</span>
                      <div className="text-base font-extrabold text-teal-700">
                        {latestEvaluation.communication}%
                      </div>
                    </div>
                  </div>

                  {/* Strengths & Gaps Analysis */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-white p-4 border border-emerald-100 space-y-2">
                      <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Strong Demonstration
                      </h5>
                      <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                        {latestEvaluation.strengths && latestEvaluation.strengths.length > 0 ? (
                          latestEvaluation.strengths.map((s, idx) => <li key={idx}>{s}</li>)
                        ) : (
                          <li>Coherent communication structure.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg bg-white p-4 border border-amber-100 space-y-2">
                      <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Info size={14} /> Identified Gaps & Missing Edge Cases
                      </h5>
                      <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                        {latestEvaluation.gaps && latestEvaluation.gaps.length > 0 ? (
                          latestEvaluation.gaps.map((g, idx) => <li key={idx}>{g}</li>)
                        ) : (
                          <li>Could elaborate further on scale and failure recovery.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Actionable Improvement */}
                  {latestEvaluation.suggestedImprovement && (
                    <div className="rounded-lg bg-blue-50 p-3.5 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <span className="font-bold">Suggested Improvement: </span>
                      {latestEvaluation.suggestedImprovement}
                    </div>
                  )}

                  {/* Adaptive Decision Notice */}
                  {activeSession.nextActionReason && (
                    <div className="rounded-lg bg-purple-50 p-3.5 border border-purple-200 text-xs text-purple-950 space-y-1">
                      <span className="font-bold">Next Interview Action Rationale: </span>
                      {activeSession.nextActionReason}
                    </div>
                  )}

                  {/* Collapsible Reference STAR Answer */}
                  {latestEvaluation.betterAnswer && (
                    <div className="border-t border-emerald-100 pt-3">
                      <button
                        onClick={() => setShowBetterAnswer(!showBetterAnswer)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
                      >
                        {showBetterAnswer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showBetterAnswer ? "Hide Architectural Reference Answer" : "View Architectural Reference Answer (STAR Model)"}
                      </button>

                      {showBetterAnswer && (
                        <div className="mt-2 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50/30 p-4 border border-emerald-200 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                            <BookOpen size={14} />
                            <span>Architectural Reference Answer — Grounded in Expected Solution</span>
                          </div>
                          <p className="rounded-lg bg-white p-3.5 text-xs text-gray-800 leading-relaxed border border-emerald-100 whitespace-pre-line shadow-sm">
                            {latestEvaluation.betterAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Final Report View */}
          {activeSession.status === "completed" && activeSession.report && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <Award className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Adaptive Interview Performance Report</h3>
                    <p className="text-xs text-gray-500">
                      Role: {activeSession.targetRole} • Company: {activeSession.targetCompany} • {activeSession.responses.length} Questions Evaluated
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white text-right">
                  <span className="text-[11px] font-semibold opacity-80 uppercase tracking-wider block">Overall Rating</span>
                  <span className="text-2xl font-extrabold">{activeSession.report.overallScore}%</span>
                </div>
              </div>

              {/* Dimension Scores Grid */}
              {activeSession.report.dimensionScores && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    5-Dimension Rubric Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500">Technical Correctness</span>
                      <div className="text-xl font-extrabold text-gray-900">
                        {activeSession.report.dimensionScores.technicalCorrectness}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500">Accuracy & Relevance</span>
                      <div className="text-xl font-extrabold text-gray-900">
                        {activeSession.report.dimensionScores.accuracy}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500">Depth of Explanation</span>
                      <div className="text-xl font-extrabold text-gray-900">
                        {activeSession.report.dimensionScores.depth}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500">Practical Application</span>
                      <div className="text-xl font-extrabold text-gray-900">
                        {activeSession.report.dimensionScores.practicalApplication}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500">Communication & Clarity</span>
                      <div className="text-xl font-extrabold text-gray-900">
                        {activeSession.report.dimensionScores.communication}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessed Skills vs Unassessed Skills */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Assessed Skills */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Assessed Technical Skills ({activeSession.report.assessedSkills?.length || 0})
                  </h4>
                  <div className="rounded-xl border border-gray-200 divide-y overflow-hidden">
                    {activeSession.report.assessedSkills && activeSession.report.assessedSkills.length > 0 ? (
                      activeSession.report.assessedSkills.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white text-xs">
                          <div>
                            <span className="font-bold text-gray-900">{s.skill}</span>
                            <span className="text-gray-400 text-[11px] block">{s.questionsCount} questions tested</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                s.status === "strong"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "competent"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {s.status.toUpperCase()}
                            </span>
                            <span className="font-bold text-gray-700">{s.score}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-gray-500">General engineering topics assessed.</p>
                    )}
                  </div>
                </div>

                {/* Unassessed Skills */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Info size={14} /> Untested Target Skills ({activeSession.report.unassessedSkills?.length || 0})
                  </h4>
                  <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-2">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      These target role skills were not evaluated in this {activeSession.length}-question session. They are not considered weak:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeSession.report.unassessedSkills && activeSession.report.unassessedSkills.length > 0 ? (
                        activeSession.report.unassessedSkills.map((u, uIdx) => (
                          <span
                            key={uIdx}
                            className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200"
                          >
                            {u}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">All prioritized skills were assessed.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Comparison */}
              {activeSession.report.historicalComparison && (
                <div className="rounded-xl bg-indigo-50/60 p-4 border border-indigo-200 flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-indigo-700 mt-0.5 shrink-0" />
                  <div className="text-xs text-indigo-950 space-y-1">
                    <span className="font-bold text-indigo-900">Historical Performance Comparison:</span>
                    <p>{activeSession.report.historicalComparison.note}</p>
                  </div>
                </div>
              )}

              {/* Concepts to Revise & Roadmap Recommendations */}
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-purple-50/70 p-4 border border-purple-100 space-y-2">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Concepts to Revise</span>
                  <ul className="list-disc pl-4 text-xs text-purple-950 space-y-1">
                    {activeSession.report.conceptsToRevise?.map((c, cIdx) => (
                      <li key={cIdx}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-blue-50/70 p-4 border border-blue-100 space-y-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={14} /> Recommended Learning Roadmap Steps
                  </span>
                  <ul className="list-disc pl-4 text-xs text-blue-950 space-y-1">
                    {activeSession.report.recommendedRoadmapSteps?.map((r, rIdx) => (
                      <li key={rIdx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setActiveSession(null);
                    fetchStatsAndActive();
                  }}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
                >
                  Start New Interview Session
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Setup Controls Section */
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Configure Mock Interview</h2>
              <p className="text-xs text-gray-500">
                Choose Adaptive AI mode to adjust difficulty and follow-ups in real-time, or select a traditional mock interview.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Interview Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Company */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Target Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Role */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Target Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Difficulty Behavior</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Adaptive AI">Adaptive AI (Real-time tuning)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="Hard">Hard (Staff / Senior)</option>
                <option value="Easy">Easy (Foundational)</option>
              </select>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Question Budget</label>
              <select
                value={selectedLength}
                onChange={(e) => setSelectedLength(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={5}>5 Questions (Quick Practice)</option>
                <option value={10}>10 Questions (Standard Interview)</option>
                <option value={20}>20 Questions (Comprehensive Assessment)</option>
              </select>
            </div>

            {/* Grounded GitHub Project */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FolderGit2 size={14} className="text-purple-600" /> Grounded GitHub Project (Optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">No Project Selected (General / Resume Mock)</option>
                {userProjects.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.projectTitle} ({proj.repo} • {proj.metadata.primaryLanguage || "Repo"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Job Description input for tailoring */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                Job Description Requirements (Optional)
              </label>
              <span className="text-[11px] text-gray-400">
                Paste job description snippet to prioritize specific required and preferred skills
              </span>
            </div>
            <textarea
              rows={3}
              value={jobDescriptionInput}
              onChange={(e) => setJobDescriptionInput(e.target.value)}
              placeholder="Paste job description text here (or leave blank to use your latest resume and roadmap profile)..."
              className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartSession}
              disabled={startingSession}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
            >
              {startingSession ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {startingSession ? "Synthesizing Personalized Interview Engine..." : "Start Adaptive Interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewPage;
