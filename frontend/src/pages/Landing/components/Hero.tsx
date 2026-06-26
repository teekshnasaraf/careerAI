import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-between gap-16 px-6 py-20 lg:flex-row">

        {/* Left Side */}

        <div className="max-w-2xl">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                🚀 AI-Powered Career Platform
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-tight text-gray-900 md:text-6xl">
                Land Your Dream Job
                <span className="block text-blue-600">
                    With AI Guidance
                </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-600">
                CareerAI helps students build stronger resumes,
                discover relevant jobs, practice interviews,
                and improve their skills with AI-powered insights.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">

                <Link
                    to="/register"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    Get Started
                    <ArrowRight size={18} />
                </Link>

                <button
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                    <PlayCircle size={20} />
                    Watch Demo
                </button>

            </div>
            <div className="mt-12 flex flex-wrap gap-10">

                <div>
                    <h3 className="text-3xl font-bold text-blue-600">10K+</h3>
                    <p className="text-gray-500">Students</p>
                </div>

                <div>
                    <h3 className="text-3xl font-bold text-blue-600">50K+</h3>
                    <p className="text-gray-500">Job Matches</p>
                </div>

                <div>
                    <h3 className="text-3xl font-bold text-blue-600">95%</h3>
                    <p className="text-gray-500">Success Rate</p>
                </div>

            </div>
        </div>

        {/* Right Side */}

        <div>
            <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">

                <h2 className="mb-8 text-2xl font-bold">
                    Dashboard Preview
                </h2>

                <div className="space-y-5">

                    <div className="rounded-xl bg-blue-50 p-5">
                    <p className="text-gray-500">Resume Score</p>
                    <h3 className="text-4xl font-bold text-blue-600">
                        92%
                    </h3>
                    </div>

                    <div className="rounded-xl bg-green-50 p-5">
                    <p className="text-gray-500">Job Matches</p>
                    <h3 className="text-4xl font-bold text-green-600">
                        37
                    </h3>
                    </div>

                    <div className="rounded-xl bg-purple-50 p-5">
                    <p className="text-gray-500">Interview Score</p>
                    <h3 className="text-4xl font-bold text-purple-600">
                        88%
                    </h3>
                    </div>

                </div>

            </div>
        </div>

      </div>
    </section>
  );
}

export default Hero;