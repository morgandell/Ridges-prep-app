import { Menu } from "./menu";

export interface PastMenu {
  id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  menu: Menu;
}
