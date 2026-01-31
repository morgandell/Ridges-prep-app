const { app, BrowserWindow, ipcMain, globalShortcut, session } = require('electron');
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
          "connect-src 'self' https://*.openstreetmap.org https://maps.googleapis.com; " +
          "font-src 'self' data:;"
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

// Initialize meals file on app ready
app.whenReady().then(() => {
  ensureMealsFile();
});

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
} else {
  // Generate new ID if not provided
  if (!cleanMeal.id) {
    cleanMeal.id = Date.now().toString();
  }
  meals.push(cleanMeal);
}
    
    // Write to file with error handling
    try {
      await fsPromises.writeFile(mealsFilePath, JSON.stringify(meals, null, 2), 'utf-8');
      return { success: true, meal: cleanMeal };
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
      stops: Array.isArray(route.stops) ? route.stops : [],
      segments: Array.isArray(route.segments) ? route.segments : [],
      notes: route.notes || undefined,
    };

    const idx = routes.findIndex(r => r.id === cleanRoute.id);
    if (idx >= 0) {
      routes[idx] = cleanRoute;
    } else {
      routes.push(cleanRoute);
    }
    writeRoutes(routes);
    return { success: true, route: cleanRoute };
  } catch (err) {
    console.error("Failed to save route:", err);
    return { success: false, error: "Failed to save route" };
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
