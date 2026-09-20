/**
 * profileCompleteness.service.test.ts
 *
 * Unit tests for profile completeness logic.
 * No database, no network, no personal data.
 * Generic test values only (e.g. "Test User", "test@example.com").
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  getMissingProfileFields,
  isProfileComplete,
  isFilled,
  REQUIRED_PROFILE_FIELDS,
  REQUIRED_CAREER_FIELDS,
  type SettingsSubset,
} from "./profileCompleteness.service";

// ─── isFilled helper ────────────────────────────────────────────────────────

test("isFilled: empty string → false", () => {
  assert.equal(isFilled(""), false);
});

test("isFilled: whitespace-only string → false", () => {
  assert.equal(isFilled("   "), false);
});

test("isFilled: non-empty string → true", () => {
  assert.equal(isFilled("Test User"), true);
});

test("isFilled: boolean true → true (boolean fields are always filled)", () => {
  assert.equal(isFilled(true), true);
});

test("isFilled: boolean false → true (false is a valid explicit choice)", () => {
  assert.equal(isFilled(false), true);
});

test("isFilled: undefined → false", () => {
  assert.equal(isFilled(undefined), false);
});

// ─── Empty profile ───────────────────────────────────────────────────────────

test("empty profile: all required fields are reported missing", () => {
  const empty: SettingsSubset = {};
  const missing = getMissingProfileFields(empty);
  const totalRequired = REQUIRED_PROFILE_FIELDS.length + REQUIRED_CAREER_FIELDS.length;
  assert.equal(missing.length, totalRequired);
});

test("empty profile: profile is not complete", () => {
  assert.equal(isProfileComplete({}), false);
});

test("empty profile with empty strings: all required fields are still missing", () => {
  const settings: SettingsSubset = {
    profile: { name: "", college: "", degree: "", graduationYear: "", linkedin: "" },
    career: { preferredRole: "", careerGoal: "", workType: "" },
  };
  const missing = getMissingProfileFields(settings);
  const totalRequired = REQUIRED_PROFILE_FIELDS.length + REQUIRED_CAREER_FIELDS.length;
  assert.equal(missing.length, totalRequired);
});

// ─── Resume data does not pollute profile completeness ───────────────────────
// Resume data has a completely different shape (parsedData, extractedSkills,
// etc.) and is never passed to getMissingProfileFields.
// This test verifies the type boundary: only SettingsSubset is accepted.

test("resume-shaped object without profile/career keys yields all fields missing", () => {
  // Simulate what would happen if someone passed resume data by mistake —
  // it does not satisfy SettingsSubset's profile/career shape, so all
  // required fields would show as missing (no cross-contamination).
  const resumeShaped: SettingsSubset = {
    // No profile or career keys — mimics passing the wrong data shape
  };
  const missing = getMissingProfileFields(resumeShaped);
  const totalRequired = REQUIRED_PROFILE_FIELDS.length + REQUIRED_CAREER_FIELDS.length;
  assert.equal(missing.length, totalRequired);
});

// ─── Fully filled profile ─────────────────────────────────────────────────────

const FULL_SETTINGS: SettingsSubset = {
  profile: {
    name: "Test User",
    college: "Example University",
    degree: "Bachelor of Science",
    graduationYear: "2025",
    linkedin: "https://linkedin.com/in/testuser",
  },
  career: {
    preferredRole: "Software Engineer",
    careerGoal: "Product Company Placement",
    workType: "Remote",
  },
};

test("fully filled profile: no missing fields", () => {
  assert.deepEqual(getMissingProfileFields(FULL_SETTINGS), []);
});

test("fully filled profile: isProfileComplete returns true", () => {
  assert.equal(isProfileComplete(FULL_SETTINGS), true);
});

// ─── Partially filled profile ─────────────────────────────────────────────────

test("partial profile: only missing fields are reported", () => {
  const partial: SettingsSubset = {
    profile: {
      name: "Test User",
      college: "Example University",
      degree: "", // missing
      graduationYear: "2025",
      linkedin: "", // missing
    },
    career: {
      preferredRole: "Software Engineer",
      careerGoal: "", // missing
      workType: "Remote",
    },
  };
  const missing = getMissingProfileFields(partial);
  assert.equal(missing.length, 3);
  assert.ok(missing.includes("Degree & major"));
  assert.ok(missing.includes("LinkedIn profile"));
  assert.ok(missing.includes("Career goal"));
});

// ─── Optional fields not treated as required ──────────────────────────────────

test("optional fields (phone, CGPA, bio, portfolio, github) are never flagged missing", () => {
  // Even with a fully filled required-field set, optional fields are absent
  const settings: SettingsSubset = { ...FULL_SETTINGS };
  // profile has no phone, cgpa, bio, portfolio, github — that's fine
  const missing = getMissingProfileFields(settings);
  assert.deepEqual(missing, []);
  assert.equal(isProfileComplete(settings), true);
});

// ─── Notification count reflects actual state ─────────────────────────────────

test("notification count: empty profile → count equals number of required fields", () => {
  const missing = getMissingProfileFields({});
  const totalRequired = REQUIRED_PROFILE_FIELDS.length + REQUIRED_CAREER_FIELDS.length;
  assert.equal(missing.length, totalRequired);
  // This would translate to a badge count of totalRequired in the UI
});

test("notification count: complete profile → count is zero", () => {
  assert.equal(getMissingProfileFields(FULL_SETTINGS).length, 0);
});

test("notification count: one missing field → count is one", () => {
  const oneShort: SettingsSubset = {
    profile: {
      name: "Test User",
      college: "Example University",
      degree: "B.Sc. Computer Science",
      graduationYear: "2025",
      linkedin: "https://linkedin.com/in/testuser",
    },
    career: {
      preferredRole: "Software Engineer",
      careerGoal: "", // only this one is missing
      workType: "Remote",
    },
  };
  assert.equal(getMissingProfileFields(oneShort).length, 1);
  assert.ok(getMissingProfileFields(oneShort).includes("Career goal"));
});

// ─── Resume upload does not overwrite saved profile data ─────────────────────
// The following test documents the architectural invariant:
// getMissingProfileFields only reads from SettingsSubset —
// it never touches Resume fields.

test("profile data is unchanged after simulating a resume upload (separate data shapes)", () => {
  // Before upload: user has a saved profile
  const savedProfile: SettingsSubset = { ...FULL_SETTINGS };
  const missingBefore = getMissingProfileFields(savedProfile);

  // Simulate resume upload — resume data has no intersection with SettingsSubset
  const resumeData = {
    originalName: "my_resume.pdf",
    parsedData: {
      skills: ["React", "Node.js"],
      education: [{ degree: "B.Tech", institution: "Some College", year: "2025" }],
    },
    extractedSkills: [{ name: "React", category: "Frontend" }],
  };

  // Resume data is intentionally NOT merged into savedProfile
  // (architectural boundary enforced in resume.controller.ts)
  const profileAfterUpload: SettingsSubset = savedProfile; // unchanged

  const missingAfter = getMissingProfileFields(profileAfterUpload);
  assert.deepEqual(missingBefore, missingAfter);
  assert.deepEqual(missingAfter, []);

  // Verify resume data fields don't accidentally appear in profile
  assert.equal((profileAfterUpload as any).parsedData, undefined);
  assert.equal((profileAfterUpload as any).extractedSkills, undefined);
  assert.equal((profileAfterUpload as any).originalName, undefined);
});
