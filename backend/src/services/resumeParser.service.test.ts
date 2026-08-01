import assert from "node:assert/strict";
import test from "node:test";
import { buildResumeAnalysisPayload, parseResumeText } from "./resumeParser.service";

test("does not treat generic website stack language as personal skills", () => {
  const parsed = parseResumeText(`
    John Doe
    Software Engineer

    This website is built with React and Node.js, but that is not a personal skill list.
    I have experience delivering reliable products for customers.
  `);

  assert.deepEqual(parsed.skills, []);
});

test("uses the same ATS score for parsed resume data and analysis payloads", () => {
  const parsed = parseResumeText(`
    John Doe
    Software Engineer

    Summary
    Backend-focused developer with experience in Java, Python, and SQL.

    Skills
    Java, Python, SQL, Docker

    Work Experience
    Senior Backend Engineer

    Education
    B.Tech in Computer Science

    Projects
    Built a scalable API service.
  `);

  const payload = buildResumeAnalysisPayload(parsed);

  assert.equal(payload.atsScore, parsed.atsScore);
  assert.ok(payload.sectionScores.skillsScore >= 40);
  assert.ok(payload.sectionScores.experienceScore >= 70);
});
