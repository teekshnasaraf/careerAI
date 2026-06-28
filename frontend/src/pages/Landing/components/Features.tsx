import {
  BrainCircuit,
  BriefcaseBusiness,
  GraduationCap,
  ChartColumn,
  Target,
  FileSearch,
} from "lucide-react";

const features = [
  {
    title: "AI Resume Analysis",
    description:
      "Upload your resume and receive AI-powered feedback, scoring, and improvement suggestions.",
    icon: FileSearch,
  },
  {
    title: "AI Job Matching",
    description:
      "Find jobs ranked according to your skills, experience, and career goals.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Mock Interviews",
    description:
      "Practice technical and HR interviews with AI-generated questions and instant evaluation.",
    icon: BrainCircuit,
  },
  {
    title: "Analytics Dashboard",
    description:
      "Track resume performance, interview scores, applications, and career progress.",
    icon: ChartColumn,
  },
  {
    title: "Skill Gap Analysis",
    description:
      "Compare your profile with your dream job and discover which skills you're missing.",
    icon: Target,
  },
  {
    title: "Learning Roadmap",
    description:
      "Receive a personalized roadmap with recommended technologies and learning milestones.",
    icon: GraduationCap,
  },
];

function Features() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Heading */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            Why Choose CareerAI?
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Everything you need to prepare for your dream career, powered by AI
            and designed specifically for students and job seekers.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl"
            >
              {/* Icon */}
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white">
                <Icon size={30} />
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

export default Features;