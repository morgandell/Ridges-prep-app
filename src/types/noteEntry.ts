export interface NoteEntry {
  id: string;
  /** Short preview shown on cards */
  summary: string;
  /** Full notes (any length) */
  body: string;
  pdf?: {
    name: string;
    path: string;
  };
  updatedAt?: string;
}

