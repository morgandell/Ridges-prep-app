const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Meals
  getMeals: () => ipcRenderer.invoke("get-meals"),
  getMeal: (id) => ipcRenderer.invoke("get-meal", id),
  saveMeal: (meal) => ipcRenderer.invoke("save-meal", meal),
  deleteMeal: (id) => ipcRenderer.invoke("delete-meal", id),

  // Single menu 
  getMenu: () => ipcRenderer.invoke("get-menu"),
  saveMenu: (menu) => ipcRenderer.invoke("save-menu", menu),

  // Week stats
  getWeekStats: () => ipcRenderer.invoke("get-week-stats"),
  saveWeekStats: (week) => ipcRenderer.invoke("save-week-stats", week),
});
