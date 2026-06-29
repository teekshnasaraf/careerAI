import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is CareerAI free to use?",
    answer:
      "Yes. CareerAI offers a free plan that includes resume analysis, job recommendations, and AI interview practice. Premium features may be introduced in the future.",
  },
  {
    question: "Which AI model powers CareerAI?",
    answer:
      "CareerAI integrates with modern AI models such as Google Gemini or OpenAI to provide intelligent resume analysis, interview feedback, and career guidance.",
  },
  {
    question: "Can I upload multiple resumes?",
    answer:
      "Yes. You can upload, manage, replace, and download multiple versions of your resume for different job roles.",
  },
  {
    question: "How does AI job matching work?",
    answer:
      "CareerAI compares your resume, skills, experience, projects, preferred role, and location with available job opportunities to recommend the best matches.",
  },
  {
    question: "Does CareerAI help with interview preparation?",
    answer:
      "Absolutely. You can practice mock interviews, receive AI-generated questions, and get detailed feedback with suggestions for improvement.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        {/* Heading */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Everything you need to know before getting started with CareerAI.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </span>

                <ChevronDown
                  size={22}
                  className={`transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openIndex === index && (
                <div className="border-t border-gray-100 px-6 py-5">
                  <p className="leading-7 text-gray-600">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;