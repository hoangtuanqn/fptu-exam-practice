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
