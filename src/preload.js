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

  // Tips & tricks
  getTips: () => ipcRenderer.invoke("get-tips"),
  getTip: (id) => ipcRenderer.invoke("get-tip", id),
  saveTip: (tip) => ipcRenderer.invoke("save-tip", tip),
  deleteTip: (id) => ipcRenderer.invoke("delete-tip", id),

  // Gear: how-to-use notes
  getGearUsageNotes: () => ipcRenderer.invoke("get-gear-usage-notes"),
  getGearUsageNote: (id) => ipcRenderer.invoke("get-gear-usage-note", id),
  saveGearUsageNote: (entry) => ipcRenderer.invoke("save-gear-usage-note", entry),
  deleteGearUsageNote: (id) => ipcRenderer.invoke("delete-gear-usage-note", id),
  attachGearUsageNotePdf: (id, filename, bytes) =>
    ipcRenderer.invoke("attach-note-pdf", { scope: "gear-usage", id, filename, bytes }),
  removeGearUsageNotePdf: (id) =>
    ipcRenderer.invoke("remove-note-pdf", { scope: "gear-usage", id }),

  // Gear: fixes notes
  getGearFixNotes: () => ipcRenderer.invoke("get-gear-fix-notes"),
  getGearFixNote: (id) => ipcRenderer.invoke("get-gear-fix-note", id),
  saveGearFixNote: (entry) => ipcRenderer.invoke("save-gear-fix-note", entry),
  deleteGearFixNote: (id) => ipcRenderer.invoke("delete-gear-fix-note", id),
  attachGearFixNotePdf: (id, filename, bytes) =>
    ipcRenderer.invoke("attach-note-pdf", { scope: "gear-fixes", id, filename, bytes }),
  removeGearFixNotePdf: (id) =>
    ipcRenderer.invoke("remove-note-pdf", { scope: "gear-fixes", id }),

  // Sundays: counselor tips
  getSundayCounselorTips: () => ipcRenderer.invoke("get-sunday-counselor-tips"),
  getSundayCounselorTip: (id) => ipcRenderer.invoke("get-sunday-counselor-tip", id),
  saveSundayCounselorTip: (entry) => ipcRenderer.invoke("save-sunday-counselor-tip", entry),
  deleteSundayCounselorTip: (id) => ipcRenderer.invoke("delete-sunday-counselor-tip", id),
  attachSundayCounselorTipPdf: (id, filename, bytes) =>
    ipcRenderer.invoke("attach-note-pdf", { scope: "sunday-counselor-tips", id, filename, bytes }),
  removeSundayCounselorTipPdf: (id) =>
    ipcRenderer.invoke("remove-note-pdf", { scope: "sunday-counselor-tips", id }),

  // Packing lists
  getPackingLists: () => ipcRenderer.invoke("get-packing-lists"),
  getPackingList: (id) => ipcRenderer.invoke("get-packing-list", id),
  savePackingList: (list) => ipcRenderer.invoke("save-packing-list", list),

  // Local file open
  openPath: (p) => ipcRenderer.invoke("open-path", p),
});


