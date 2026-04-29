import React from "react";
import NoteEntryEdit from "./noteEntryEdit";

export default function GearUsageNoteEdit() {
  return (
    <NoteEntryEdit
      title="How-to-use note"
      backTo="/gear"
      loadOne={(id) => window.electronAPI.getGearUsageNote(id)}
      save={(entry) => window.electronAPI.saveGearUsageNote(entry)}
      attachPdf={(id, filename, bytes) => window.electronAPI.attachGearUsageNotePdf(id, filename, bytes)}
      removePdf={(id) => window.electronAPI.removeGearUsageNotePdf(id)}
      detailPathForId={(id) => `/gear/usage/${id}`}
    />
  );
}

