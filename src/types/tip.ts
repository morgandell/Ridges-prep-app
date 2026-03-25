export interface Tip {
  id: string;
  /** Short preview shown on cards and as the title on the detail page */
  summary: string;
  /** Full notes (any length) */
  body: string;
  updatedAt?: string;
}
