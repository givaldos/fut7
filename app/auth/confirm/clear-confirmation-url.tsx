"use client";

import { useEffect } from "react";

export function ClearConfirmationUrl() {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  return null;
}
