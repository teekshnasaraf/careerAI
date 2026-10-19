import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDAG,
  validateCuratedSkillGraph,
  buildPersonalizedSkillRoadmap,
} from "./skillGraph.service";
import { generateRoadmap } from "./roadmap.service";
import { canonicalizeSkillName } from "../data/skills/skillDependencyGraph";

test("1. Valid DAG construction: curated skill prerequisite graph is a valid DAG with 0 cycles", () => {
  const result = validateCuratedSkillGraph();
  assert.equal(result.isValid, true, "Curated skill graph must be a valid DAG");
  assert.equal(result.cycle, undefined);
});

test("2. Cycle detection: detects a simple 2-node cycle (A -> B -> A)", () => {
  const adjacency = new Map<string, string[]>([
    ["NodeA", ["NodeB"]],
    ["NodeB", ["NodeA"]],
  ]);
  const result = validateDAG(adjacency);
  assert.equal(result.isValid, false);
  assert.ok(result.cycle && result.cycle.length >= 2);
  assert.ok(result.error?.includes("Cycle detected"));
});

test("3. Multi-node cycle detection: detects cycle involving multiple skills (A -> B -> C -> A)", () => {
  const adjacency = new Map<string, string[]>([
    ["Python", ["Data Analysis"]],
    ["Data Analysis", ["Machine Learning"]],
    ["Machine Learning", ["Python"]], // Artificial back-edge
  ]);
  const result = validateDAG(adjacency);
  assert.equal(result.isValid, false);
  assert.ok(result.cycle);
  assert.equal(result.cycle[0], result.cycle[result.cycle.length - 1]);
});

test("4. Correct topological ordering: prerequisites appear strictly before dependents", () => {
  const { allSkillsToLearn } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "Express", priority: "required" }],
    demonstratedSkills: [], // Candidate knows nothing
  });

  // Express depends on Node.js and REST API; Node.js depends on JavaScript; REST API depends on HTTP; HTTP depends on Computer Networks
  const jsIdx = allSkillsToLearn.indexOf("JavaScript");
  const nodeIdx = allSkillsToLearn.indexOf("Node.js");
  const expressIdx = allSkillsToLearn.indexOf("Express");
  const restIdx = allSkillsToLearn.indexOf("REST API");

  assert.ok(jsIdx !== -1, "JavaScript must be included");
  assert.ok(nodeIdx !== -1, "Node.js must be included");
  assert.ok(expressIdx !== -1, "Express must be included");
  assert.ok(restIdx !== -1, "REST API must be included");

  assert.ok(jsIdx < nodeIdx, "JavaScript must precede Node.js");
  assert.ok(nodeIdx < expressIdx, "Node.js must precede Express");
  assert.ok(restIdx < expressIdx, "REST API must precede Express");
});

test("5. Skills with multiple prerequisites: React requires JavaScript, HTML, and CSS", () => {
  const { allSkillsToLearn } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "React", priority: "required" }],
    demonstratedSkills: [],
  });

  const htmlIdx = allSkillsToLearn.indexOf("HTML");
  const cssIdx = allSkillsToLearn.indexOf("CSS");
  const jsIdx = allSkillsToLearn.indexOf("JavaScript");
  const reactIdx = allSkillsToLearn.indexOf("React");

  assert.ok(htmlIdx !== -1 && cssIdx !== -1 && jsIdx !== -1 && reactIdx !== -1);
  assert.ok(htmlIdx < cssIdx, "HTML must precede CSS");
  assert.ok(htmlIdx < reactIdx, "HTML must precede React");
  assert.ok(cssIdx < reactIdx, "CSS must precede React");
  assert.ok(jsIdx < reactIdx, "JavaScript must precede React");
});

test("6. Shared prerequisites across multiple target skills: deduplicated into a single step", () => {
  // Both Express and Next.js require Node.js and JavaScript
  const { allSkillsToLearn } = buildPersonalizedSkillRoadmap({
    missingSkills: [
      { name: "Express", priority: "required" },
      { name: "Next.js", priority: "required" },
    ],
    demonstratedSkills: [],
  });

  // Verify JavaScript and Node.js appear exactly once
  const jsCount = allSkillsToLearn.filter((s) => s === "JavaScript").length;
  const nodeCount = allSkillsToLearn.filter((s) => s === "Node.js").length;

  assert.equal(jsCount, 1, "JavaScript must only appear once");
  assert.equal(nodeCount, 1, "Node.js must only appear once");

  const jsIdx = allSkillsToLearn.indexOf("JavaScript");
  const nodeIdx = allSkillsToLearn.indexOf("Node.js");
  const expressIdx = allSkillsToLearn.indexOf("Express");
  const nextIdx = allSkillsToLearn.indexOf("Next.js");

  assert.ok(jsIdx < nodeIdx);
  assert.ok(nodeIdx < expressIdx);
  assert.ok(nodeIdx < nextIdx);
});

test("7. Prerequisites absent from the job description: retained as unmet prerequisites", () => {
  // JD only mentions Next.js, not JavaScript or React
  const { allSkillsToLearn, unmetPrerequisites, targetSkills } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "Next.js", priority: "required" }],
    demonstratedSkills: [],
  });

  assert.ok(targetSkills.includes("Next.js"));
  assert.ok(!targetSkills.includes("JavaScript")); // Not in JD
  assert.ok(!targetSkills.includes("React")); // Not in JD

  // But both must be discovered and retained in unmetPrerequisites
  assert.ok(unmetPrerequisites.includes("JavaScript"));
  assert.ok(unmetPrerequisites.includes("React"));
  assert.ok(unmetPrerequisites.includes("Node.js"));
  assert.ok(allSkillsToLearn.includes("JavaScript"));
  assert.ok(allSkillsToLearn.includes("React"));
});

test("8. Prerequisites already demonstrated by candidate: excluded from learning steps", () => {
  // Candidate already has JavaScript and HTML on resume
  const { allSkillsToLearn, demonstratedPrerequisites } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "React", priority: "required" }],
    demonstratedSkills: ["JavaScript", "HTML"],
  });

  assert.ok(!allSkillsToLearn.includes("JavaScript"), "Demonstrated JavaScript must be excluded");
  assert.ok(!allSkillsToLearn.includes("HTML"), "Demonstrated HTML must be excluded");

  // CSS is NOT demonstrated, so it must remain
  assert.ok(allSkillsToLearn.includes("CSS"), "CSS must remain as an unmet prerequisite");
  assert.ok(allSkillsToLearn.includes("React"), "React must remain as the target skill");

  assert.ok(demonstratedPrerequisites.includes("JavaScript"));
  assert.ok(demonstratedPrerequisites.includes("HTML"));
});

test("9. Duplicate skills and aliases: normalize to canonical nodes", () => {
  assert.equal(canonicalizeSkillName("ReactJS"), "React");
  assert.equal(canonicalizeSkillName("NodeJS"), "Node.js");
  assert.equal(canonicalizeSkillName("TS"), "TypeScript");
  assert.equal(canonicalizeSkillName("Postgres"), "PostgreSQL");

  const { allSkillsToLearn } = buildPersonalizedSkillRoadmap({
    missingSkills: [
      { name: "ReactJS", priority: "required" },
      { name: "React", priority: "preferred" },
    ],
    demonstratedSkills: ["JavaScript", "HTML", "CSS"],
  });

  const reactCount = allSkillsToLearn.filter((s) => s === "React").length;
  assert.equal(reactCount, 1, "Duplicate mentions and aliases must collapse to single canonical step");
});

test("10. Required vs preferred target skills prioritization: required skills prioritized when both ready", () => {
  // Python is a prerequisite for both Django (required) and Flask (preferred)
  // When candidate already has Python, both Django and Flask are ready (in-degree 0)
  const { allSkillsToLearn } = buildPersonalizedSkillRoadmap({
    missingSkills: [
      { name: "Flask", priority: "preferred" },
      { name: "Django", priority: "required" },
    ],
    demonstratedSkills: ["Python", "SQL", "HTTP", "REST API", "DBMS"],
  });

  const djangoIdx = allSkillsToLearn.indexOf("Django");
  const flaskIdx = allSkillsToLearn.indexOf("Flask");

  assert.ok(djangoIdx !== -1 && flaskIdx !== -1);
  assert.ok(djangoIdx < flaskIdx, "Required skill (Django) must be ordered before Preferred skill (Flask)");
});

test("11. Deterministic ordering for identical inputs: yields identical sequences across runs", () => {
  const input = {
    missingSkills: [
      { name: "PostgreSQL", priority: "required" as const },
      { name: "Docker", priority: "preferred" as const },
      { name: "React", priority: "required" as const },
      { name: "TypeScript", priority: "unspecified" as const },
    ],
    demonstratedSkills: ["Git"],
  };

  const run1 = buildPersonalizedSkillRoadmap(input);
  const run2 = buildPersonalizedSkillRoadmap(input);
  const run3 = buildPersonalizedSkillRoadmap(input);

  assert.deepEqual(run1.allSkillsToLearn, run2.allSkillsToLearn);
  assert.deepEqual(run2.allSkillsToLearn, run3.allSkillsToLearn);
});

test("12. Empty target-skill lists: handled gracefully and returns empty roadmap", async () => {
  const roadmap = await generateRoadmap({
    missingSkills: [],
    demonstratedSkills: ["JavaScript", "React"],
    jobTitle: "Frontend Developer",
  });

  assert.equal(roadmap.totalSteps, 0);
  assert.equal(roadmap.completionPercentage, 100);
  assert.equal(roadmap.steps.length, 0);
  assert.ok(roadmap.rationale.includes("covers all recognized requirements"));
});

test("13. Unknown skills with no graph definitions: included as standalone leaf nodes without crashing", () => {
  const { allSkillsToLearn, targetSkills } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "NovelFrameworkX", priority: "required" }],
    demonstratedSkills: [],
  });

  assert.ok(targetSkills.includes("NovelFrameworkX"));
  assert.ok(allSkillsToLearn.includes("NovelFrameworkX"));
  assert.equal(allSkillsToLearn.length, 1);
});

test("14. Invalid dependency definitions or cyclic graph: throws structured error", () => {
  assert.throws(
    () => {
      buildPersonalizedSkillRoadmap({
        missingSkills: [{ name: "SkillA", priority: "required" }],
        demonstratedSkills: [],
        customGraphDefinitions: [
          { skill: "SkillA", prerequisites: ["SkillB"], rationale: "A needs B" },
          { skill: "SkillB", prerequisites: ["SkillA"], rationale: "B needs A" },
        ],
      });
    },
    /Cycle detected/,
    "Cyclic graph must be rejected with an error"
  );
});

test("15. AI output validation and fallback: generateRoadmap produces full structured steps with deterministic templates", async () => {
  const roadmap = await generateRoadmap({
    missingSkills: [
      { name: "Express", priority: "required" },
      { name: "TypeScript", priority: "required" },
    ],
    demonstratedSkills: ["HTML", "CSS"],
    jobTitle: "Backend Developer",
  });

  assert.ok(roadmap.totalSteps > 0);
  assert.ok(roadmap.phases.length > 0);

  // Verify each step has all required pedagogical fields
  for (const step of roadmap.steps) {
    assert.ok(step.stepNumber >= 1);
    assert.ok(step.phase >= 1);
    assert.ok(step.skillName.length > 0);
    assert.ok(step.learningObjective.length > 0);
    assert.ok(Array.isArray(step.suggestedActivities) && step.suggestedActivities.length > 0);
    assert.ok(step.practicalExercise.length > 0);
    assert.ok(step.projectDeliverable.length > 0);
    assert.ok(step.completionCriteria.length > 0);
    assert.equal(step.status, "not_started");
  }
});

test("16. Roadmap phase structure: foundations in Phase 1, direct requirements in Phase 2/3", async () => {
  const roadmap = await generateRoadmap({
    missingSkills: [{ name: "Docker", priority: "required" }],
    demonstratedSkills: [], // Does not know Linux or Operating Systems
  });

  const osStep = roadmap.steps.find((s) => s.skillName === "Operating Systems");
  const linuxStep = roadmap.steps.find((s) => s.skillName === "Linux");
  const dockerStep = roadmap.steps.find((s) => s.skillName === "Docker");

  assert.ok(osStep && linuxStep && dockerStep);
  assert.ok(osStep.stepNumber < linuxStep.stepNumber, "OS must precede Linux");
  assert.ok(linuxStep.stepNumber < dockerStep.stepNumber, "Linux must precede Docker");
  assert.equal(osStep.priority, "prerequisite");
  assert.equal(dockerStep.priority, "required");
});

test("17. Completion percentage updates: completed skills accurately reflect progress", async () => {
  const roadmap = await generateRoadmap({
    missingSkills: [
      { name: "React", priority: "required" },
      { name: "Node.js", priority: "required" },
    ],
    demonstratedSkills: ["HTML", "CSS"],
    completedSkills: ["JavaScript"], // User already completed JavaScript step
  });

  const jsStep = roadmap.steps.find((s) => s.skillName === "JavaScript");
  assert.ok(jsStep);
  assert.equal(jsStep.status, "completed");
  assert.ok(roadmap.completedSteps >= 1);
  assert.ok(roadmap.completionPercentage > 0);
});

test("18. Downstream unlocks mapping: Node.js shows unlocking Express in graph node", () => {
  const { graph } = buildPersonalizedSkillRoadmap({
    missingSkills: [{ name: "Express", priority: "required" }],
    demonstratedSkills: [],
  });

  const nodeNode = graph.nodes.find((n) => n.name === "Node.js");
  assert.ok(nodeNode);
  assert.ok(nodeNode.dependents.includes("Express"), "Node.js must list Express as a dependent");
  assert.ok(nodeNode.unlockedTargetSkills.includes("Express"));
});
