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

  // Past menus
  getPastMenus: () => ipcRenderer.invoke("get-past-menus"),
  savePastMenu: (pastMenu) => ipcRenderer.invoke("save-past-menu", pastMenu),
  deletePastMenu: (id) => ipcRenderer.invoke("delete-past-menu", id),

  // Routes
  getRoutes: () => ipcRenderer.invoke("get-routes"),
  getRoute: (id) => ipcRenderer.invoke("get-route", id),
  saveRoute: (route) => ipcRenderer.invoke("save-route", route),
  deleteRoute: (id) => ipcRenderer.invoke("delete-route", id),
});


