import { PastMenu } from "../types/pastMenu";
import { Menu } from "../types/menu";

/**
 * Saves the given menu to past menus with the specified name.
 * Returns the API result.
 */
export async function saveMenuToPast(
  menu: Menu,
  name: string
): Promise<{ success: boolean; pastMenu?: PastMenu; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Please enter a menu name" };
  }

  const newPastMenu: PastMenu = {
    id: Date.now().toString(),
    name: trimmed,
    date: new Date().toISOString().split("T")[0],
    menu,
  };

  return window.electronAPI.savePastMenu(newPastMenu);
}
