export interface PackingList {
  /** Stable id used in routes (e.g. "campers", "group-gear", "personal") */
  id: string;
  title: string;
  items: string[];
  updatedAt?: string;
}

