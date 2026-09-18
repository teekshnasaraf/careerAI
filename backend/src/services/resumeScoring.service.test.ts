import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeterministicResumeScore } from "./resumeScoring.service";

const skill = (name: string, weight: number, occurrences: number, sections: string[]) => ({ name, category: "Test", weight, occurrences, sections });

test("scores an empty resume at zero and reports missing foundations", () => {
  const result = calculateDeterministicResumeScore({ cleanedText: "", sections: {}, extractedSkills: [] });
  assert.equal(result.overall, 0);
  assert.equal(result.subscores.skillCoverage, 0);
  assert.ok(result.weaknesses.some((item) => item.includes("Skills")));
});

test("keeps skill coverage at zero when readable content has no recognized skills", () => {
  const result = calculateDeterministicResumeScore({
    cleanedText: "Candidate profile and academic history without controlled technology terms.",
    sections: { summary: "Candidate profile focused on general professional development.", education: "Bachelor degree coursework" },
    extractedSkills: [],
  });
  assert.equal(result.subscores.skillCoverage, 0);
  assert.ok(result.overall > 0);
  assert.ok(result.weaknesses.some((item) => item.includes("No controlled taxonomy")));
});

test("does not inflate one skill through repeated mentions", () => {
  const once = calculateDeterministicResumeScore({ cleanedText: "React", sections: { skills: "React" }, extractedSkills: [skill("React", 5, 1, ["skills"])] });
  const repeated = calculateDeterministicResumeScore({ cleanedText: "React ".repeat(100), sections: { skills: "React ".repeat(100) }, extractedSkills: [skill("React", 5, 100, ["skills"])] });
  assert.equal(once.subscores.skillCoverage, 5);
  assert.equal(repeated.subscores.skillCoverage, 5);
  assert.equal(repeated.subscores.skillEvidence, 1);
});

test("rewards weighted skills and project evidence without requiring work experience", () => {
  const result = calculateDeterministicResumeScore({
    cleanedText: "x".repeat(300),
    sections: { summary: "Student developer building accessible web products.", education: "B.Tech Computer Science", skills: "React TypeScript Node.js", projects: "Built and deployed a React application using TypeScript for 500 users.", },
    extractedSkills: [skill("React", 5, 2, ["skills", "projects"]), skill("TypeScript", 5, 2, ["skills", "projects"]), skill("Node.js", 5, 1, ["skills", "projects"])],
  });
  assert.equal(result.subscores.skillCoverage, 15);
  assert.equal(result.subscores.sectionCompleteness, 18);
  assert.equal(result.subscores.projectEvidence, 15);
  assert.equal(result.subscores.experienceEvidence, 0);
  assert.ok(result.overall > 50);
});

test("is reproducible, bounded, and gives cross-section skill evidence", () => {
  const input = { cleanedText: "x".repeat(300), sections: { skills: "React", experience: "Developed React features for 20 customers." }, extractedSkills: [skill("React", 5, 2, ["skills", "experience"])] };
  const first = calculateDeterministicResumeScore(input);
  const second = calculateDeterministicResumeScore(input);
  assert.deepEqual(first, second);
  assert.ok(first.overall >= 0 && first.overall <= 100);
  assert.equal(first.subscores.skillEvidence, 2);
  assert.equal(first.subscores.experienceEvidence, 6);
});
