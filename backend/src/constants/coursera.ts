export const COURSERA = {
  titleLength: 255,
  urlLength: 500,
  codeLength: 32,
  emailLength: 254,
  passwordLength: 512,
  noteLength: 2000,
  searchLength: 100,
  maxPrice: 100_000_000,
  orderRate: 5,
  credentialRate: 20,
  lookupRate: 10, // per user per minute
  lookupTimeoutMs: 5000,
  lookupMaxBytes: 64 * 1024,
  linkPrice: 50000, // wallet credits for a course added from a member-pasted link
} as const;

export const COURSERA_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"] as const;
export type CourseraStatus = typeof COURSERA_STATUSES[number];
export const COURSERA_TRANSITIONS: Record<CourseraStatus, readonly CourseraStatus[]> = {
  PENDING: ["PROCESSING", "REJECTED", "CANCELLED"],
  PROCESSING: ["COMPLETED", "REJECTED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};
export const isCourseraTerminal = (status: CourseraStatus) => COURSERA_TRANSITIONS[status].length === 0;
