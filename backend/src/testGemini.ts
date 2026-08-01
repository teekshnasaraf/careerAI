import { generateResumeAnalysis } from "./services/ai.service";

async function testFullAiFlow() {
  console.log("Testing generateResumeAnalysis with multi-model fallback...");
  const result = await generateResumeAnalysis("Software Engineer with React, TypeScript, Node.js and MongoDB experience.", {
    summary: "Full stack developer building modern web apps",
    skills: ["React", "TypeScript", "Node.js", "MongoDB"],
    experience: [{ title: "Software Engineer", company: "Tech Enterprise" }],
    education: [{ degree: "B.Tech Computer Science" }],
    projects: [{ title: "CareerAI" }],
  });

  console.log(">>> SUCCESS! Single Source of Truth AI Analysis Result:\n", JSON.stringify(result, null, 2));
}

testFullAiFlow();
