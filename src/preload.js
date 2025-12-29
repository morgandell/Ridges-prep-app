const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getMeals: () => ipcRenderer.invoke('get-meals'),
  getMeal: (id) => ipcRenderer.invoke('get-meal', id),
  saveMeal: (meal) => ipcRenderer.invoke('save-meal', meal),
  deleteMeal: (id) => ipcRenderer.invoke('delete-meal', id),
});
