"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";

/** One small confirmation for all exits from a dirty form. Successful Save uses the original close. */
export function useDiscardChanges(onDiscard: () => void) {
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  function requestClose() {
    if (dirty) setConfirming(true);
    else onDiscard();
  }
  return {
    setDirty,
    requestClose,
    confirmation: <ConfirmDialog open={confirming} title="Discard your changes?" description="Your unfinished changes will be lost." confirmLabel="Discard changes" tone="danger"
      onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); setDirty(false); onDiscard(); }} />
  };
}
