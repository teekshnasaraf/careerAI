import test from "node:test";
import assert from "node:assert/strict";
import { analyzeProjects } from "./projectAnalysis.service";
import { calculateProjectRelevance } from "./projectJobMatching.service";
import { parseJobDescription } from "./jobDescription.service";

test("calculateProjectRelevance: computes relevance when project has required and preferred skills", () => {
  const projects = [
    {
      title: "React Dashboard",
      description:
        "Engineered, built, and deployed a modern dashboard using React, TypeScript, and Tailwind CSS with 99.9% uptime for 5000 users.",
      links: ["https://dashboard-live.app"],
    },
  ];

  const analyzed = analyzeProjects(projects);

  const jdText = `
    Job Title: Senior Frontend Engineer
    Required Skills:
    - React
    - TypeScript
    Preferred Skills:
    - Tailwind CSS
  `;

  const parsedJd = parseJobDescription(jdText);
  const relevance = calculateProjectRelevance(analyzed, parsedJd);

  assert.strictEqual(relevance.length, 1);
  const projRel = relevance[0];
  assert.strictEqual(projRel.title, "React Dashboard");
  assert.ok(projRel.matchedRequiredSkills.includes("React"));
  assert.ok(projRel.matchedRequiredSkills.includes("TypeScript"));
  assert.ok(projRel.matchedPreferredSkills.includes("Tailwind CSS"));
  assert.ok(projRel.relevanceScore >= 80, `Expected high relevance, got ${projRel.relevanceScore}`);
  assert.ok(projRel.jobValue >= 70, `Expected high job value, got ${projRel.jobValue}`);
});

test("calculateProjectRelevance: returns zero relevance when JD has no recognized skills", () => {
  const projects = [
    {
      title: "Backend Service",
      description: "Implemented a high-throughput microservice in Node.js.",
      links: [],
    },
  ];

  const analyzed = analyzeProjects(projects);
  const parsedJd = parseJobDescription("We are looking for enthusiastic team players who communicate well.");
  const relevance = calculateProjectRelevance(analyzed, parsedJd);

  assert.strictEqual(relevance.length, 1);
  assert.strictEqual(relevance[0].relevanceScore, 0);
});

test("calculateProjectRelevance: yields different relevance for the same project against different JDs", () => {
  const project = [
    {
      title: "Fullstack Platform",
      description:
        "Built and deployed a cloud platform using React, Node.js, and Docker, reducing load times by 40%.",
      links: ["https://platform-demo.com"],
    },
  ];

  const analyzed = analyzeProjects(project);

  const webJd = parseJobDescription("Requires React and Node.js with web development experience.");
  const mlJd = parseJobDescription("Requires PyTorch and TensorFlow for machine learning research.");

  const webRel = calculateProjectRelevance(analyzed, webJd);
  const mlRel = calculateProjectRelevance(analyzed, mlJd);

  assert.ok(
    webRel[0].relevanceScore > mlRel[0].relevanceScore,
    `Web relevance (${webRel[0].relevanceScore}) should be much higher than ML relevance (${mlRel[0].relevanceScore})`
  );
});

test("calculateProjectRelevance: jobValue balances strength (40%) and relevance (60%)", () => {
  const strongProject = [
    {
      title: "Strong Project",
      description:
        "Engineered, built, deployed, and scaled a system in React with 99.9% uptime for 10000 users, reducing latency by 45ms.",
      links: ["https://live-service.com"],
    },
  ];

  const analyzed = analyzeProjects(strongProject);
  const jd = parseJobDescription("Requires React. Experience with web apps preferred.");
  const relevance = calculateProjectRelevance(analyzed, jd);

  const p = relevance[0];
  const expectedValue = Math.round(analyzed[0].strength.overall * 0.4 + p.relevanceScore * 0.6);
  assert.strictEqual(p.jobValue, expectedValue);
});
