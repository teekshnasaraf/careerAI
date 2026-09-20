/**
 * profileCompleteness.service.ts
 *
 * Pure utility — no DB, no network calls.
 * Determines which profile/career fields the user has yet to fill in.
 *
 * "Required" fields are deliberately limited to information that meaningfully
 * affects the application's AI personalisation. Fields that are genuinely
 * optional (e.g. portfolio URL, CGPA, bio) are NOT included so we don't
 * generate false-positive "missing" notifications.
 */

export interface ProfileSubset {
  name?: string;
  college?: string;
  degree?: string;
  graduationYear?: string;
  linkedin?: string;
}

export interface CareerSubset {
  preferredRole?: string;
  careerGoal?: string;
  workType?: string;
}

export interface SettingsSubset {
  profile?: ProfileSubset;
  career?: CareerSubset;
}

export interface ProfileFieldCheck {
  label: string;
  getValue: (s: SettingsSubset) => string | undefined;
}

/**
 * Fields that must be filled before the profile is considered "complete".
 * Only genuinely required information is listed here.
 * Optional fields (phone, CGPA, bio, portfolio, github, avatar, etc.) are omitted.
 */
export const REQUIRED_PROFILE_FIELDS: ProfileFieldCheck[] = [
  { label: "Full name",            getValue: (s) => s.profile?.name },
  { label: "College / University", getValue: (s) => s.profile?.college },
  { label: "Degree & major",       getValue: (s) => s.profile?.degree },
  { label: "Graduation year",      getValue: (s) => s.profile?.graduationYear },
  { label: "LinkedIn profile",     getValue: (s) => s.profile?.linkedin },
];

export const REQUIRED_CAREER_FIELDS: ProfileFieldCheck[] = [
  { label: "Preferred target role", getValue: (s) => s.career?.preferredRole },
  { label: "Career goal",           getValue: (s) => s.career?.careerGoal },
  { label: "Work setup preference", getValue: (s) => s.career?.workType },
];

/**
 * Returns true when a field value is non-empty.
 * Boolean fields are always considered filled (they have a meaningful on/off state).
 */
export const isFilled = (val: string | boolean | undefined): boolean => {
  if (typeof val === "boolean") return true;
  return typeof val === "string" && val.trim().length > 0;
};

/**
 * Computes the list of required field labels that are currently empty.
 * Resume data is never passed into this function — separation is enforced by type.
 */
export const getMissingProfileFields = (settings: SettingsSubset): string[] =>
  [...REQUIRED_PROFILE_FIELDS, ...REQUIRED_CAREER_FIELDS]
    .filter((f) => !isFilled(f.getValue(settings)))
    .map((f) => f.label);

/**
 * Returns true when all required fields are filled.
 */
export const isProfileComplete = (settings: SettingsSubset): boolean =>
  getMissingProfileFields(settings).length === 0;
