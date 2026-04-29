import React from "react";
import NoteEntryDetail from "./noteEntryDetail";

export default function SundayCounselorTipDetail() {
  return (
    <NoteEntryDetail
      backTo="/sundays"
      titleFallback="Counselor tips"
      loadOne={(id) => window.electronAPI.getSundayCounselorTip(id)}
      onDelete={(id) => window.electronAPI.deleteSundayCounselorTip(id)}
      editPathForId={(id) => `/sundays/counselor-tips/${id}/edit`}
    />
  );
}

