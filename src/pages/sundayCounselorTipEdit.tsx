import React from "react";
import NoteEntryEdit from "./noteEntryEdit";

export default function SundayCounselorTipEdit() {
  return (
    <NoteEntryEdit
      title="Counselor tip"
      backTo="/sundays"
      loadOne={(id) => window.electronAPI.getSundayCounselorTip(id)}
      save={(entry) => window.electronAPI.saveSundayCounselorTip(entry)}
      attachPdf={(id, filename, bytes) => window.electronAPI.attachSundayCounselorTipPdf(id, filename, bytes)}
      removePdf={(id) => window.electronAPI.removeSundayCounselorTipPdf(id)}
      detailPathForId={(id) => `/sundays/counselor-tips/${id}`}
    />
  );
}

