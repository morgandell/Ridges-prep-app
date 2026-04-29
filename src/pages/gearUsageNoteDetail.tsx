import React from "react";
import NoteEntryDetail from "./noteEntryDetail";

export default function GearUsageNoteDetail() {
  return (
    <NoteEntryDetail
      backTo="/gear"
      titleFallback="How to use and maintain equipment"
      loadOne={(id) => window.electronAPI.getGearUsageNote(id)}
      onDelete={(id) => window.electronAPI.deleteGearUsageNote(id)}
      editPathForId={(id) => `/gear/usage/${id}/edit`}
    />
  );
}

