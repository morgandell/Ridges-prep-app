import { Meal } from "./meal";
import { WeekStats } from "./weekStats";
import { Menu } from "./menu";
import { PastMenu } from "./pastMenu";
import { Route } from "./route";
import { Tip } from "./tip";
import { NoteEntry } from "./noteEntry";
import { PackingList } from "./packingList";

export interface ElectronAPI {
  getMeals: () => Promise<Meal[]>;
  getMeal: (id: string) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  saveMeal: (meal: Meal) => Promise<{ success: boolean; meal?: Meal; error?: string }>;
  deleteMeal: (id: string) => Promise<{ success: boolean; error?: string }>;

   // Weekly menu 
  getMenu: () => Promise<Menu>;
  saveMenu: (menu: Menu) => Promise<{ success: boolean; error?: string }>;

  // Week stats
  getWeekStats: () => Promise<{ success: boolean; weeks?: WeekStats[]; error?: string }>;
  saveWeekStats: (week: WeekStats) => Promise<{ success: boolean; error?: string }>;

  // Past menus
  getPastMenus: () => Promise<{ success: boolean; pastMenus?: PastMenu[]; error?: string }>;
  savePastMenu: (pastMenu: PastMenu) => Promise<{ success: boolean; pastMenu?: PastMenu; error?: string }>;
  deletePastMenu: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Routes
  getRoutes: () => Promise<{ success: boolean; routes?: Route[]; error?: string }>;
  getRoute: (id: string) => Promise<{ success: boolean; route?: Route; error?: string }>;
  saveRoute: (route: Route) => Promise<{ success: boolean; route?: Route; error?: string }>;
  deleteRoute: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Tips & tricks
  getTips: () => Promise<Tip[]>;
  getTip: (id: string) => Promise<{ success: boolean; tip?: Tip; error?: string }>;
  saveTip: (tip: Partial<Tip> & { summary: string }) => Promise<{ success: boolean; tip?: Tip; error?: string }>;
  deleteTip: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Gear: how-to-use notes
  getGearUsageNotes: () => Promise<NoteEntry[]>;
  getGearUsageNote: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  saveGearUsageNote: (entry: NoteEntry) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  deleteGearUsageNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  attachGearUsageNotePdf: (
    id: string,
    filename: string,
    bytes: Uint8Array
  ) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  removeGearUsageNotePdf: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;

  // Gear: fixes notes
  getGearFixNotes: () => Promise<NoteEntry[]>;
  getGearFixNote: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  saveGearFixNote: (entry: NoteEntry) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  deleteGearFixNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  attachGearFixNotePdf: (
    id: string,
    filename: string,
    bytes: Uint8Array
  ) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  removeGearFixNotePdf: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;

  // Sundays: counselor tips
  getSundayCounselorTips: () => Promise<NoteEntry[]>;
  getSundayCounselorTip: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  saveSundayCounselorTip: (entry: NoteEntry) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  deleteSundayCounselorTip: (id: string) => Promise<{ success: boolean; error?: string }>;
  attachSundayCounselorTipPdf: (
    id: string,
    filename: string,
    bytes: Uint8Array
  ) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;
  removeSundayCounselorTipPdf: (id: string) => Promise<{ success: boolean; entry?: NoteEntry; error?: string }>;

  // Open local file path (e.g. PDF attachments)
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>;

  // Packing lists
  getPackingLists: () => Promise<PackingList[]>;
  getPackingList: (id: string) => Promise<{ success: boolean; list?: PackingList; error?: string }>;
  savePackingList: (list: PackingList) => Promise<{ success: boolean; list?: PackingList; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

