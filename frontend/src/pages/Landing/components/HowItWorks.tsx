import {
  Upload,
  ScanSearch,
  BriefcaseBusiness,
  MessageSquareText,
  BrainCircuit,
  Trophy,
} from "lucide-react";

const steps = [
  {
    title: "Upload Resume",
    description: "Upload your resume securely in PDF format.",
    icon: Upload,
  },
  {
    title: "AI Resume Analysis",
    description:
      "CareerAI analyzes your resume, extracts skills, and provides improvement suggestions.",
    icon: ScanSearch,
  },
  {
    title: "Discover Best Jobs",
    description:
      "Get personalized job recommendations based on your profile and experience.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Practice Interviews",
    description:
      "Prepare using AI-generated technical and HR interview questions.",
    icon: MessageSquareText,
  },
  {
    title: "Receive AI Feedback",
    description:
      "Get detailed scores, strengths, weaknesses, and improvement tips.",
    icon: BrainCircuit,
  },
  {
    title: "Land Your Dream Job",
    description:
      "Apply confidently with a stronger resume and better interview skills.",
    icon: Trophy,
  },
];

function HowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            How CareerAI Works
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            From uploading your resume to landing your dream job, CareerAI
            guides you through every step of your career journey.
          </p>
        </div>

        {/* Timeline */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-gray-200 bg-gray-50 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:bg-white hover:shadow-xl"
            >
              {/* Step Number */}
              <div className="absolute right-6 top-6 text-5xl font-extrabold text-gray-100">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={28} />
              </div>

              {/* Title */}
              <h3 className="mb-3 text-xl font-semibold text-gray-900">
                {title}
              </h3>

              {/* Description */}
              <p className="leading-7 text-gray-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;