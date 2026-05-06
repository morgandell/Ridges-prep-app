const { app, BrowserWindow, ipcMain, globalShortcut, session, shell } = require('electron');
const path = require('node:path');
const fs = require("fs");
const fsPromises = fs.promises;
const pastMenusPath = path.join(app.getPath("userData"), "past-menus.json");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.maximize(); // fills screen but keeps window controls
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  globalShortcut.register("Control+Shift+I", () => {
    mainWindow.webContents.toggleDevTools();
  });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ensureMealsFile();
  ensureTipsFile();
  registerTipsIpcHandlers();
  registerGearAndSundayIpcHandlers();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://*.openstreetmap.org https://*.tile.openstreetmap.org; " +
          "connect-src 'self' https://*.openstreetmap.org https://maps.googleapis.com https://router.project-osrm.org https://api.openrouteservice.org; " +          "font-src 'self' data:;"
        ]
      }
    });
  });
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Meals data file path
const mealsFilePath = path.join(app.getPath('userData'), 'meals.json');

// Ensure meals file exists
async function ensureMealsFile() {
  try {
    await fsPromises.access(mealsFilePath);
  } catch {
    // File doesn't exist, create it with empty array
    await fsPromises.writeFile(mealsFilePath, JSON.stringify([], null, 2));
  }
}

const tipsFilePath = path.join(app.getPath('userData'), 'tips-and-tricks.json');
const gearUsageNotesPath = path.join(app.getPath("userData"), "gear-usage-notes.json");
const gearFixNotesPath = path.join(app.getPath("userData"), "gear-fix-notes.json");
const sundayCounselorTipsPath = path.join(app.getPath("userData"), "sunday-counselor-tips.json");
const packingListsPath = path.join(app.getPath("userData"), "packing-lists.json");

async function ensureTipsFile() {
  try {
    await fsPromises.access(tipsFilePath);
  } catch {
    await fsPromises.writeFile(tipsFilePath, JSON.stringify([], null, 2));
  }
}

async function ensureJsonArrayFile(filePath) {
  try {
    await fsPromises.access(filePath);
  } catch {
    await fsPromises.writeFile(filePath, JSON.stringify([], null, 2));
  }
}

async function readJsonArray(filePath) {
  try {
    await ensureJsonArrayFile(filePath);
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading json array:", filePath, err);
    return [];
  }
}

async function writeJsonArray(filePath, arr) {
  await fsPromises.writeFile(filePath, JSON.stringify(arr, null, 2), "utf-8");
}

function cleanNoteEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const summary = String(entry.summary || "").trim();
  if (!summary) return null;
  const now = new Date().toISOString();
  return {
    id: String(entry.id || Date.now().toString()),
    summary,
    body: typeof entry.body === "string" ? entry.body : "",
    pdf:
      entry.pdf && typeof entry.pdf === "object"
        ? {
            name: String(entry.pdf.name || "").trim(),
            path: String(entry.pdf.path || "").trim(),
          }
        : undefined,
    updatedAt: now,
  };
}

function cleanPackingList(list) {
  if (!list || typeof list !== "object") return null;
  const id = String(list.id || "").trim();
  const title = String(list.title || "").trim();
  if (!id || !title) return null;
  const items = Array.isArray(list.items)
    ? list.items.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const now = new Date().toISOString();
  return { id, title, items, updatedAt: now };
}

/** Name + text comments on meals, routes, tips */
function sanitizeItemComments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c) =>
        c &&
        typeof c === 'object' &&
        String(c.authorName || '').trim() &&
        String(c.text || '').trim()
    )
    .map((c) => ({
      id: String(c.id || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`),
      authorName: String(c.authorName).trim(),
      text: String(c.text).trim(),
      createdAt: c.createdAt || new Date().toISOString(),
    }));
}

function registerTipsIpcHandlers() {
  for (const channel of ['get-tips', 'get-tip', 'save-tip', 'delete-tip']) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle('get-tips', async () => {
    try {
      await ensureTipsFile();
      const data = await fsPromises.readFile(tipsFilePath, 'utf-8');
      const tips = JSON.parse(data);
      return Array.isArray(tips) ? tips : [];
    } catch (error) {
      console.error('Error reading tips:', error);
      return [];
    }
  });

  ipcMain.handle('get-tip', async (event, id) => {
    try {
      if (!id) {
        return { success: false, error: 'Tip ID is required' };
      }
      await ensureTipsFile();
      const data = await fsPromises.readFile(tipsFilePath, 'utf-8');
      const tips = JSON.parse(data);
      if (!Array.isArray(tips)) {
        return { success: false, error: 'Invalid tips data format' };
      }
      const tip = tips.find(t => t.id === id);
      if (!tip) {
        return { success: false, error: 'Tip not found' };
      }
      return { success: true, tip };
    } catch (error) {
      console.error('Error reading tip:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-tip', async (event, tip) => {
    try {
      if (!tip) {
        return { success: false, error: 'No tip data provided' };
      }
      if (!tip.summary || String(tip.summary).trim() === '') {
        return { success: false, error: 'Summary is required' };
      }
      const now = new Date().toISOString();
      const cleanTip = {
        id: tip.id || Date.now().toString(),
        summary: String(tip.summary).trim(),
        body: typeof tip.body === 'string' ? tip.body : '',
        updatedAt: now,
      };
      await ensureTipsFile();
      const data = await fsPromises.readFile(tipsFilePath, 'utf-8');
      let tips = [];
      try {
        tips = JSON.parse(data);
        if (!Array.isArray(tips)) tips = [];
      } catch (parseError) {
        console.error('Error parsing tips file, resetting:', parseError);
        tips = [];
      }
      if (cleanTip.id && tips.some(t => t.id === cleanTip.id)) {
        const index = tips.findIndex(t => t.id === cleanTip.id);
        tips[index] = { ...tips[index], ...cleanTip };
        if (tip.comments !== undefined) {
          tips[index].comments = sanitizeItemComments(tip.comments);
        }
      } else {
        if (!cleanTip.id) {
          cleanTip.id = Date.now().toString();
        }
        if (tip.comments !== undefined) {
          cleanTip.comments = sanitizeItemComments(tip.comments);
        }
        tips.push(cleanTip);
      }
      const savedTip = tips.find(t => t.id === cleanTip.id) || cleanTip;
      await fsPromises.writeFile(tipsFilePath, JSON.stringify(tips, null, 2), 'utf-8');
      return { success: true, tip: savedTip };
    } catch (error) {
      console.error('Error saving tip:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-tip', async (event, id) => {
    try {
      await ensureTipsFile();
      const data = await fsPromises.readFile(tipsFilePath, 'utf-8');
      const tips = JSON.parse(data);
      const filtered = tips.filter(t => t.id !== id);
      await fsPromises.writeFile(tipsFilePath, JSON.stringify(filtered, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error deleting tip:', error);
      return { success: false, error: error.message };
    }
  });
}

function registerGearAndSundayIpcHandlers() {
  const channels = [
    "get-gear-usage-notes",
    "get-gear-usage-note",
    "save-gear-usage-note",
    "delete-gear-usage-note",
    "get-gear-fix-notes",
    "get-gear-fix-note",
    "save-gear-fix-note",
    "delete-gear-fix-note",
    "get-sunday-counselor-tips",
    "get-sunday-counselor-tip",
    "save-sunday-counselor-tip",
    "delete-sunday-counselor-tip",
    "get-packing-lists",
    "get-packing-list",
    "save-packing-list",
    "attach-note-pdf",
    "remove-note-pdf",
    "open-path",
  ];
  for (const ch of channels) ipcMain.removeHandler(ch);

  function notesPathForScope(scope) {
    if (scope === "gear-usage") return gearUsageNotesPath;
    if (scope === "gear-fixes") return gearFixNotesPath;
    if (scope === "sunday-counselor-tips") return sundayCounselorTipsPath;
    return null;
  }

  async function getNoteById(scope, id) {
    const fp = notesPathForScope(scope);
    if (!fp) return { success: false, error: "Invalid scope" };
    if (!id) return { success: false, error: "Entry ID is required" };
    const all = await readJsonArray(fp);
    const entry = all.find((e) => String(e.id) === String(id));
    if (!entry) return { success: false, error: "Entry not found" };
    return { success: true, entry };
  }

  // Gear usage notes
  ipcMain.handle("get-gear-usage-notes", async () => {
    return await readJsonArray(gearUsageNotesPath);
  });
  ipcMain.handle("get-gear-usage-note", async (_event, id) => {
    return await getNoteById("gear-usage", id);
  });
  ipcMain.handle("save-gear-usage-note", async (_event, entry) => {
    try {
      const clean = cleanNoteEntry(entry);
      if (!clean) return { success: false, error: "Summary is required" };
      const all = await readJsonArray(gearUsageNotesPath);
      const idx = all.findIndex((e) => String(e.id) === String(clean.id));
      if (idx >= 0) all[idx] = { ...all[idx], ...clean };
      else all.push(clean);
      await writeJsonArray(gearUsageNotesPath, all);
      return { success: true, entry: clean };
    } catch (err) {
      console.error("Error saving gear usage note:", err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("delete-gear-usage-note", async (_event, id) => {
    try {
      const all = await readJsonArray(gearUsageNotesPath);
      const next = all.filter((e) => String(e.id) !== String(id));
      await writeJsonArray(gearUsageNotesPath, next);
      return { success: true };
    } catch (err) {
      console.error("Error deleting gear usage note:", err);
      return { success: false, error: err.message };
    }
  });

  // Gear fix notes
  ipcMain.handle("get-gear-fix-notes", async () => {
    return await readJsonArray(gearFixNotesPath);
  });
  ipcMain.handle("get-gear-fix-note", async (_event, id) => {
    return await getNoteById("gear-fixes", id);
  });
  ipcMain.handle("save-gear-fix-note", async (_event, entry) => {
    try {
      const clean = cleanNoteEntry(entry);
      if (!clean) return { success: false, error: "Summary is required" };
      const all = await readJsonArray(gearFixNotesPath);
      const idx = all.findIndex((e) => String(e.id) === String(clean.id));
      if (idx >= 0) all[idx] = { ...all[idx], ...clean };
      else all.push(clean);
      await writeJsonArray(gearFixNotesPath, all);
      return { success: true, entry: clean };
    } catch (err) {
      console.error("Error saving gear fix note:", err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("delete-gear-fix-note", async (_event, id) => {
    try {
      const all = await readJsonArray(gearFixNotesPath);
      const next = all.filter((e) => String(e.id) !== String(id));
      await writeJsonArray(gearFixNotesPath, next);
      return { success: true };
    } catch (err) {
      console.error("Error deleting gear fix note:", err);
      return { success: false, error: err.message };
    }
  });

  // Sundays counselor tips
  ipcMain.handle("get-sunday-counselor-tips", async () => {
    return await readJsonArray(sundayCounselorTipsPath);
  });
  ipcMain.handle("get-sunday-counselor-tip", async (_event, id) => {
    return await getNoteById("sunday-counselor-tips", id);
  });
  ipcMain.handle("save-sunday-counselor-tip", async (_event, entry) => {
    try {
      const clean = cleanNoteEntry(entry);
      if (!clean) return { success: false, error: "Summary is required" };
      const all = await readJsonArray(sundayCounselorTipsPath);
      const idx = all.findIndex((e) => String(e.id) === String(clean.id));
      if (idx >= 0) all[idx] = { ...all[idx], ...clean };
      else all.push(clean);
      await writeJsonArray(sundayCounselorTipsPath, all);
      return { success: true, entry: clean };
    } catch (err) {
      console.error("Error saving counselor tip:", err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("delete-sunday-counselor-tip", async (_event, id) => {
    try {
      const all = await readJsonArray(sundayCounselorTipsPath);
      const next = all.filter((e) => String(e.id) !== String(id));
      await writeJsonArray(sundayCounselorTipsPath, next);
      return { success: true };
    } catch (err) {
      console.error("Error deleting counselor tip:", err);
      return { success: false, error: err.message };
    }
  });

  // Packing lists
  ipcMain.handle("get-packing-lists", async () => {
    return await readJsonArray(packingListsPath);
  });
  ipcMain.handle("get-packing-list", async (_event, id) => {
    try {
      if (!id) return { success: false, error: "List ID is required" };
      const all = await readJsonArray(packingListsPath);
      const list = all.find((l) => String(l.id) === String(id));
      if (!list) return { success: false, error: "List not found" };
      return { success: true, list };
    } catch (err) {
      console.error("Error reading packing list:", err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("save-packing-list", async (_event, list) => {
    try {
      const clean = cleanPackingList(list);
      if (!clean) return { success: false, error: "List id and title are required" };
      const all = await readJsonArray(packingListsPath);
      const idx = all.findIndex((l) => String(l.id) === String(clean.id));
      if (idx >= 0) all[idx] = { ...all[idx], ...clean };
      else all.push(clean);
      await writeJsonArray(packingListsPath, all);
      return { success: true, list: clean };
    } catch (err) {
      console.error("Error saving packing list:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("attach-note-pdf", async (_event, payload) => {
    try {
      const scope = String(payload?.scope || "");
      const id = String(payload?.id || "");
      const filename = String(payload?.filename || "attachment.pdf");
      const bytes = payload?.bytes;
      const fp = notesPathForScope(scope);
      if (!fp) return { success: false, error: "Invalid scope" };
      if (!id) return { success: false, error: "Entry ID is required" };
      if (!bytes || typeof bytes.length !== "number") {
        return { success: false, error: "PDF bytes are required" };
      }

      const all = await readJsonArray(fp);
      const idx = all.findIndex((e) => String(e.id) === String(id));
      if (idx < 0) return { success: false, error: "Entry not found" };

      const safeName = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
      const dir = path.join(app.getPath("userData"), "attachments", scope, id);
      await fsPromises.mkdir(dir, { recursive: true });
      const outPath = path.join(dir, `${Date.now()}-${safeName}`.replace(/[<>:"/\\|?*]/g, "_"));
      await fsPromises.writeFile(outPath, Buffer.from(bytes));

      const now = new Date().toISOString();
      const entry = {
        ...all[idx],
        pdf: { name: safeName, path: outPath },
        updatedAt: now,
      };
      all[idx] = entry;
      await writeJsonArray(fp, all);
      return { success: true, entry };
    } catch (err) {
      console.error("Error attaching note pdf:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("remove-note-pdf", async (_event, payload) => {
    try {
      const scope = String(payload?.scope || "");
      const id = String(payload?.id || "");
      const fp = notesPathForScope(scope);
      if (!fp) return { success: false, error: "Invalid scope" };
      if (!id) return { success: false, error: "Entry ID is required" };
      const all = await readJsonArray(fp);
      const idx = all.findIndex((e) => String(e.id) === String(id));
      if (idx < 0) return { success: false, error: "Entry not found" };
      const now = new Date().toISOString();
      const entry = { ...all[idx], pdf: undefined, updatedAt: now };
      all[idx] = entry;
      await writeJsonArray(fp, all);
      return { success: true, entry };
    } catch (err) {
      console.error("Error removing note pdf:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("open-path", async (_event, p) => {
    try {
      const target = String(p || "");
      if (!target) return { success: false, error: "Path is required" };
      const userData = app.getPath("userData");
      if (!target.startsWith(userData)) {
        return { success: false, error: "Not allowed" };
      }
      await shell.openPath(target);
      return { success: true };
    } catch (err) {
      console.error("Error opening path:", err);
      return { success: false, error: err.message };
    }
  });
}

// IPC handlers for meals
ipcMain.handle('get-meals', async () => {
  try {
    await ensureMealsFile();
    const data = await fsPromises.readFile(mealsFilePath, 'utf-8');
    const meals = JSON.parse(data);
    return Array.isArray(meals) ? meals : [];
  } catch (error) {
    console.error('Error reading meals:', error);
    return [];
  }
});

ipcMain.handle('get-meal', async (event, id) => {
  try {
    if (!id) {
      return { success: false, error: 'Meal ID is required' };
    }
    
    await ensureMealsFile();
    const data = await fsPromises.readFile(mealsFilePath, 'utf-8');
    const meals = JSON.parse(data);
    
    if (!Array.isArray(meals)) {
      return { success: false, error: 'Invalid meals data format' };
    }
    
    const meal = meals.find(m => m.id === id);
    
    if (!meal) {
      return { success: false, error: 'Meal not found' };
    }
    
    return { success: true, meal };
  } catch (error) {
    console.error('Error reading meal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-meal', async (event, meal) => {
  try {
    // Validate meal data
    if (!meal) {
      return { success: false, error: 'No meal data provided' };
    }
    
    if (!meal.name || meal.name.trim() === '') {
      return { success: false, error: 'Meal name is required' };
    }

    // Ensure arrays exist
    if (!Array.isArray(meal.ingredients)) {
      meal.ingredients = [];
    }
    if (!Array.isArray(meal.instructions)) {
      meal.instructions = [];
    }
    if (!Array.isArray(meal.tags)) {
      meal.tags = [];
    }

    
const cleanMeal = {
  id: meal.id || Date.now().toString(),
  name: meal.name.trim(),
  description: meal.description || '',
  ingredients: (Array.isArray(meal.ingredients) ? meal.ingredients : [])
    .filter(
      i =>
        i &&
        typeof i === "object" &&
        i.name &&
        i.name.trim() !== ""
    )
    .map(i => ({
      ...i,
      name: i.name.trim(),
      unit: i.unit?.trim()
    })),
  instructions: (Array.isArray(meal.instructions) ? meal.instructions : []).filter(i => i && i.trim() !== ''),
  tags: (Array.isArray(meal.tags) ? meal.tags : []).filter(t => t && t.trim() !== ''),
  mealTime: meal.mealTime || 'dinner', // include mealTime (default if missing)
};
// Load existing meals from file
await ensureMealsFile();
const data = await fsPromises.readFile(mealsFilePath, 'utf-8');
let meals = [];
try {
  meals = JSON.parse(data);
  if (!Array.isArray(meals)) meals = [];
} catch (parseError) {
  console.error('Error parsing meals file, resetting:', parseError);
  meals = [];
}

// If meal has an id, update existing by merging (preserve other fields); otherwise, add new
if (cleanMeal.id && meals.some(m => m.id === cleanMeal.id)) {
  const index = meals.findIndex(m => m.id === cleanMeal.id);
  meals[index] = { ...meals[index], ...cleanMeal };
  if (meal.comments !== undefined) {
    meals[index].comments = sanitizeItemComments(meal.comments);
  }
} else {
  // Generate new ID if not provided
  if (!cleanMeal.id) {
    cleanMeal.id = Date.now().toString();
  }
  if (meal.comments !== undefined) {
    cleanMeal.comments = sanitizeItemComments(meal.comments);
  }
  meals.push(cleanMeal);
}

    const savedMeal = meals.find(m => m.id === cleanMeal.id) || cleanMeal;
    
    // Write to file with error handling
    try {
      await fsPromises.writeFile(mealsFilePath, JSON.stringify(meals, null, 2), 'utf-8');
      return { success: true, meal: savedMeal };
    } catch (writeError) {
      console.error('Error writing meals file:', writeError);
      return { 
        success: false, 
        error: `Failed to write to file: ${writeError.message}. Check file permissions.` 
      };
    }
  } catch (error) {
    console.error('Error saving meal:', error);
    return { 
      success: false, 
      error: `Unexpected error: ${error.message}. Please check the console for details.` 
    };
  }
});

ipcMain.handle('delete-meal', async (event, id) => {
  try {
    await ensureMealsFile();
    const data = await fsPromises.readFile(mealsFilePath, 'utf-8');
    const meals = JSON.parse(data);
    const filtered = meals.filter(m => m.id !== id);
    await fsPromises.writeFile(mealsFilePath, JSON.stringify(filtered, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error deleting meal:', error);
    return { success: false, error: error.message };
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const MENU_PATH = path.join(app.getPath("userData"), "menu.json");
const WEEK_STATS_PATH = path.join(app.getPath("userData"), "weekStats.json");
const ROUTES_PATH = path.join(app.getPath("userData"), "routes.json");

function createEmptyMenu() {
  return {
    days: {
      sunday: {},
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
    },
  };
}

function readMenu() {
  try {
    if (!fs.existsSync(MENU_PATH)) {
      return { week: [] };
    }
    return JSON.parse(fs.readFileSync(MENU_PATH, "utf-8"));
  } catch (err) {
    console.error("Failed to read menu:", err);
    return { week: [] };
  }
}

function writeMenu(menu) {
  fs.writeFileSync(MENU_PATH, JSON.stringify(menu, null, 2));
}


ipcMain.handle("save-menu", async (_event, menu) => {
  try {
    writeMenu(menu);
    return { success: true };
  } catch (err) {
    console.error("Failed to save menu:", err);
    return { success: false, error: "Failed to save menu" };
  }
});
ipcMain.handle("get-menu", async () => {
  const menuPath = path.join(app.getPath("userData"), "menu.json");

  if (!fs.existsSync(menuPath)) {
    const emptyMenu = createEmptyMenu();
    fs.writeFileSync(menuPath, JSON.stringify(emptyMenu, null, 2));
    return emptyMenu;
  }

  return JSON.parse(fs.readFileSync(menuPath, "utf-8"));
});

function readWeekStats() {
  try {
    if (!fs.existsSync(WEEK_STATS_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(WEEK_STATS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read weekStats:", err);
    return [];
  }
}

function writeWeekStats(weeks) {
  fs.writeFileSync(
    WEEK_STATS_PATH,
    JSON.stringify(weeks, null, 2),
    "utf-8"
  );
}

ipcMain.handle("get-week-stats", async () => {
  try {
    const weeks = readWeekStats();
    return { success: true, weeks };
  } catch (err) {
    console.error("Failed to get week stats:", err);
    return { success: false, error: "Failed to read week stats" };
  }
});

ipcMain.handle("save-week-stats", async (_event, week) => {
  try {
    if (!week) {
      return { success: false, error: "No week data provided" };
    }

    const weeks = readWeekStats();
    const idx = weeks.findIndex(w => w.id === week.id);
    if (idx >= 0) {
      weeks[idx] = { ...weeks[idx], ...week };
    } else {
      weeks.push(week);
    }
    writeWeekStats(weeks);
    return { success: true };
  } catch (err) {
    console.error("Failed to save week stats:", err);
    return { success: false, error: "Failed to save week stats" };
  }
});


function loadPastMenus() {
  if (!fs.existsSync(pastMenusPath)) return [];
  return JSON.parse(fs.readFileSync(pastMenusPath, "utf-8"));
}

function savePastMenus(pastMenus) {
  fs.writeFileSync(pastMenusPath, JSON.stringify(pastMenus, null, 2));
}

ipcMain.handle("get-past-menus", async () => {
  return {
    success: true,
    pastMenus: loadPastMenus(),
  };
});

ipcMain.handle("save-past-menu", async (_event, pastMenu) => {
  const pastMenus = loadPastMenus();
  pastMenus.push(pastMenu);
  savePastMenus(pastMenus);

  return {
    success: true,
    pastMenu,
  };
});

ipcMain.handle("delete-past-menu", async (_event, id) => {
  const pastMenus = loadPastMenus().filter(pm => pm.id !== id);
  savePastMenus(pastMenus);

  return { success: true };
});

// Routes handlers
function readRoutes() {
  try {
    if (!fs.existsSync(ROUTES_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(ROUTES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read routes:", err);
    return [];
  }
}

function writeRoutes(routes) {
  fs.writeFileSync(
    ROUTES_PATH,
    JSON.stringify(routes, null, 2),
    "utf-8"
  );
}

ipcMain.handle("get-routes", async () => {
  try {
    const routes = readRoutes();
    return { success: true, routes };
  } catch (err) {
    console.error("Failed to get routes:", err);
    return { success: false, error: "Failed to read routes" };
  }
});

ipcMain.handle("get-route", async (_event, id) => {
  try {
    if (!id) {
      return { success: false, error: "Route ID is required" };
    }
    
    const routes = readRoutes();
    const route = routes.find(r => r.id === id);
    
    if (!route) {
      return { success: false, error: "Route not found" };
    }
    
    return { success: true, route };
  } catch (err) {
    console.error("Failed to get route:", err);
    return { success: false, error: "Failed to read route" };
  }
});

ipcMain.handle("save-route", async (_event, route) => {
  try {
    if (!route) {
      return { success: false, error: "No route data provided" };
    }
    if (!route.name || route.name.trim() === "") {
      return { success: false, error: "Route name is required" };
    }

    const routes = readRoutes();
    const cleanRoute = {
      id: route.id || Date.now().toString(),
      name: route.name.trim(),
      startPoint: route.startPoint || { lat: 0, lng: 0 },
      endPoint: route.endPoint || { lat: 0, lng: 0 },
      stops: Array.isArray(route.stops)
        ? route.stops.map((s) => {
            const type = s.type || s.stopType || "view";
            return {
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              label: s.label,
              type,
              note: s.note,
            };
          })
        : [],
      segments: Array.isArray(route.segments) ? route.segments : [],
      evacPoints: Array.isArray(route.evacPoints)
        ? route.evacPoints.map((p) => ({
            lat: typeof p.lat === "number" ? p.lat : 0,
            lng: typeof p.lng === "number" ? p.lng : 0,
            label: p.label,
          }))
        : undefined,
      notes: route.notes || undefined,
      images: Array.isArray(route.images)
        ? route.images
            .filter((img) => img && typeof img === "object" && String(img.path || "").trim())
            .map((img) => ({
              id: String(img.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
              name: String(img.name || "").trim() || "route-image",
              path: String(img.path || "").trim(),
              mimeType: String(img.mimeType || "").trim() || undefined,
              description: String(img.description || "").trim() || undefined,
            }))
        : route.image && typeof route.image === "object" && String(route.image.path || "").trim()
        ? [
            {
              id: String(route.image.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
              name: String(route.image.name || "").trim() || "route-image",
              path: String(route.image.path || "").trim(),
              mimeType: String(route.image.mimeType || "").trim() || undefined,
              description: String(route.image.description || "").trim() || undefined,
            },
          ]
        : undefined,
      ageGroup: route.ageGroup || undefined,
      transportMode: route.transportMode || undefined,
      driveMileage: typeof route.driveMileage === "number" ? route.driveMileage : undefined,
    };

    const idx = routes.findIndex(r => r.id === cleanRoute.id);
    if (idx >= 0) {
      routes[idx] = { ...routes[idx], ...cleanRoute };
      if (route.comments !== undefined) {
        routes[idx].comments = sanitizeItemComments(route.comments);
      }
    } else {
      const toPush = { ...cleanRoute };
      if (route.comments !== undefined) {
        toPush.comments = sanitizeItemComments(route.comments);
      }
      routes.push(toPush);
    }
    const savedRoute = routes.find(r => r.id === cleanRoute.id) || cleanRoute;
    writeRoutes(routes);
    return { success: true, route: savedRoute };
  } catch (err) {
    console.error("Failed to save route:", err);
    return { success: false, error: "Failed to save route" };
  }
});

ipcMain.handle("attach-route-image", async (_event, payload) => {
  try {
    const id = String(payload?.id || "");
    const filename = String(payload?.filename || "route-image");
    const mimeType = String(payload?.mimeType || "image/jpeg");
    const description = String(payload?.description || "").trim();
    const bytes = payload?.bytes;
    if (!id) return { success: false, error: "Route ID is required" };
    if (!bytes || typeof bytes.length !== "number") {
      return { success: false, error: "Image bytes are required" };
    }

    const routes = readRoutes();
    const idx = routes.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return { success: false, error: "Route not found" };

    const extension =
      mimeType === "image/png"
        ? ".png"
        : mimeType === "image/webp"
        ? ".webp"
        : mimeType === "image/gif"
        ? ".gif"
        : ".jpg";
    const safeName = filename.toLowerCase().endsWith(extension) ? filename : `${filename}${extension}`;
    const dir = path.join(app.getPath("userData"), "attachments", "routes", id);
    await fsPromises.mkdir(dir, { recursive: true });
    const outPath = path.join(dir, `${Date.now()}-${safeName}`.replace(/[<>:"/\\|?*]/g, "_"));
    await fsPromises.writeFile(outPath, Buffer.from(bytes));

    const existingImages = Array.isArray(routes[idx].images)
      ? routes[idx].images
      : routes[idx].image && routes[idx].image.path
      ? [
          {
            id: String(routes[idx].image.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
            name: routes[idx].image.name || "route-image",
            path: routes[idx].image.path,
            mimeType: routes[idx].image.mimeType,
            description: routes[idx].image.description,
          },
        ]
      : [];

    const updated = {
      ...routes[idx],
      images: [
        ...existingImages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: safeName,
          path: outPath,
          mimeType,
          description: description || undefined,
        },
      ],
      image: undefined,
    };
    routes[idx] = updated;
    writeRoutes(routes);
    return { success: true, route: updated };
  } catch (err) {
    console.error("Failed to attach route image:", err);
    return { success: false, error: err.message || "Failed to attach image" };
  }
});

ipcMain.handle("remove-route-image", async (_event, payload) => {
  try {
    const rid = String(payload?.id || "");
    const imageId = String(payload?.imageId || "");
    if (!rid) return { success: false, error: "Route ID is required" };
    if (!imageId) return { success: false, error: "Image ID is required" };
    const routes = readRoutes();
    const idx = routes.findIndex((r) => String(r.id) === String(rid));
    if (idx < 0) return { success: false, error: "Route not found" };
    const existingImages = Array.isArray(routes[idx].images)
      ? routes[idx].images
      : routes[idx].image && routes[idx].image.path
      ? [
          {
            id: String(routes[idx].image.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
            name: routes[idx].image.name || "route-image",
            path: routes[idx].image.path,
            mimeType: routes[idx].image.mimeType,
            description: routes[idx].image.description,
          },
        ]
      : [];
    const updated = {
      ...routes[idx],
      images: existingImages.filter((img) => String(img.id) !== imageId),
      image: undefined,
    };
    routes[idx] = updated;
    writeRoutes(routes);
    return { success: true, route: updated };
  } catch (err) {
    console.error("Failed to remove route image:", err);
    return { success: false, error: err.message || "Failed to remove image" };
  }
});

ipcMain.handle("update-route-image-description", async (_event, payload) => {
  try {
    const rid = String(payload?.id || "");
    const imageId = String(payload?.imageId || "");
    const description = String(payload?.description || "").trim();
    if (!rid) return { success: false, error: "Route ID is required" };
    if (!imageId) return { success: false, error: "Image ID is required" };
    const routes = readRoutes();
    const idx = routes.findIndex((r) => String(r.id) === String(rid));
    if (idx < 0) return { success: false, error: "Route not found" };
    const existingImages = Array.isArray(routes[idx].images)
      ? routes[idx].images
      : routes[idx].image && routes[idx].image.path
      ? [
          {
            id: String(routes[idx].image.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
            name: routes[idx].image.name || "route-image",
            path: routes[idx].image.path,
            mimeType: routes[idx].image.mimeType,
            description: routes[idx].image.description,
          },
        ]
      : [];
    const updated = {
      ...routes[idx],
      images: existingImages.map((img) =>
        String(img.id) === imageId ? { ...img, description: description || undefined } : img
      ),
      image: undefined,
    };
    routes[idx] = updated;
    writeRoutes(routes);
    return { success: true, route: updated };
  } catch (err) {
    console.error("Failed to update route image description:", err);
    return { success: false, error: err.message || "Failed to update description" };
  }
});

ipcMain.handle("get-route-image-preview", async (_event, payload) => {
  try {
    const rid = String(payload?.id || "");
    const imageId = String(payload?.imageId || "");
    if (!rid) return { success: false, error: "Route ID is required" };
    if (!imageId) return { success: false, error: "Image ID is required" };
    const routes = readRoutes();
    const route = routes.find((r) => String(r.id) === String(rid));
    if (!route) return { success: false, error: "Route not found" };
    const images = Array.isArray(route.images)
      ? route.images
      : route.image && route.image.path
      ? [
          {
            id: String(route.image.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
            name: route.image.name || "route-image",
            path: route.image.path,
            mimeType: route.image.mimeType,
            description: route.image.description,
          },
        ]
      : [];
    const target = images.find((img) => String(img.id) === imageId);
    if (!target?.path) return { success: false, error: "Image not found" };
    const bytes = await fsPromises.readFile(target.path);
    const mimeType = target.mimeType || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    return { success: true, dataUrl };
  } catch (err) {
    console.error("Failed to read route image preview:", err);
    return { success: false, error: err.message || "Failed to load image" };
  }
});

ipcMain.handle("delete-route", async (_event, id) => {
  try {
    if (!id) {
      return { success: false, error: "Route ID is required" };
    }

    const routes = readRoutes();
    const filtered = routes.filter(r => r.id !== id);
    writeRoutes(filtered);
    return { success: true };
  } catch (err) {
    console.error("Failed to delete route:", err);
    return { success: false, error: "Failed to delete route" };
  }
});
