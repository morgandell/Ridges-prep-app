import React from "react";
import NoteEntryDetail from "./noteEntryDetail";

export default function GearFixNoteDetail() {
  return (
    <NoteEntryDetail
      backTo="/gear"
      titleFallback="Fixes"
      loadOne={(id) => window.electronAPI.getGearFixNote(id)}
      onDelete={(id) => window.electronAPI.deleteGearFixNote(id)}
      editPathForId={(id) => `/gear/fixes/${id}/edit`}
    />
  );
}

