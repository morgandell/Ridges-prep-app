const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs').promises;

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
    },
  });

  mainWindow.maximize(); // fills screen but keeps window controls
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
    await fs.access(mealsFilePath);
  } catch {
    // File doesn't exist, create it with empty array
    await fs.writeFile(mealsFilePath, JSON.stringify([], null, 2));
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
    const data = await fs.readFile(mealsFilePath, 'utf-8');
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
    const data = await fs.readFile(mealsFilePath, 'utf-8');
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

    // // Clean up the meal object - remove undefined values
    // const cleanMeal = {
    //   id: meal.id || Date.now().toString(),
    //   name: meal.name.trim(),
    //   description: meal.description || '',
    //   ingredients: meal.ingredients.filter(i => i && i.trim() !== ''),
    //   instructions: meal.instructions.filter(i => i && i.trim() !== ''),
    //   prepTime: meal.prepTime || undefined,
    //   cookTime: meal.cookTime || undefined,
    //   servings: meal.servings || undefined,
    //   tags: meal.tags.filter(t => t && t.trim() !== ''),
    //   mealTime: meal.mealTime || 'dinner', // include mealTime (default if missing)
    // };

    // await ensureMealsFile();
    // const data = await fs.readFile(mealsFilePath, 'utf-8');
    // let meals = [];
    
    // try {
    //   meals = JSON.parse(data);
    //   if (!Array.isArray(meals)) {
    //     meals = [];
    //   }
    // } catch (parseError) {
    //   console.error('Error parsing meals file, resetting:', parseError);
    //   meals = [];
    // }
    
    // // If meal has an id, update existing; otherwise, add new
    // if (cleanMeal.id && meals.some(m => m.id === cleanMeal.id)) {
    //   const index = meals.findIndex(m => m.id === cleanMeal.id);
    //   meals[index] = cleanMeal;
    // } else {
    //   // Generate new ID if not provided
    //   if (!cleanMeal.id) {
    //     cleanMeal.id = Date.now().toString();
    //   }
    //   meals.push(cleanMeal);
    // }
    // Clean up the meal object - remove undefined values and include mealTime
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
const data = await fs.readFile(mealsFilePath, 'utf-8');
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
      await fs.writeFile(mealsFilePath, JSON.stringify(meals, null, 2), 'utf-8');
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
    const data = await fs.readFile(mealsFilePath, 'utf-8');
    const meals = JSON.parse(data);
    const filtered = meals.filter(m => m.id !== id);
    await fs.writeFile(mealsFilePath, JSON.stringify(filtered, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error deleting meal:', error);
    return { success: false, error: error.message };
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
