import React from "react";
import NoteEntryEdit from "./noteEntryEdit";

export default function GearFixNoteEdit() {
  return (
    <NoteEntryEdit
      title="Fix note"
      backTo="/gear"
      loadOne={(id) => window.electronAPI.getGearFixNote(id)}
      save={(entry) => window.electronAPI.saveGearFixNote(entry)}
      attachPdf={(id, filename, bytes) => window.electronAPI.attachGearFixNotePdf(id, filename, bytes)}
      removePdf={(id) => window.electronAPI.removeGearFixNotePdf(id)}
      detailPathForId={(id) => `/gear/fixes/${id}`}
    />
  );
}

