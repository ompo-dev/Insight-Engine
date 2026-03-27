"use client";

import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function TauriWindowShortcuts() {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let handlingShortcut = false;
    let f11Pressed = false;

    const toggleWindowMaximize = async () => {
      if (disposed || handlingShortcut) {
        return;
      }

      handlingShortcut = true;

      try {
        const appWindow = getCurrentWindow();
        const isMaximized = await appWindow.isMaximized();

        if (isMaximized) {
          await appWindow.unmaximize();
          return;
        }

        await appWindow.maximize();
      } catch (error) {
        console.error("Failed to toggle desktop maximize state with F11.", error);
      } finally {
        handlingShortcut = false;
      }
    };

    const isF11Event = (event: KeyboardEvent) => {
      return event.code === "F11" || event.key === "F11";
    };

    const handleShortcutEvent = (event: KeyboardEvent) => {
      if (!isF11Event(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.type === "keydown") {
        if (event.repeat || f11Pressed) {
          return;
        }

        f11Pressed = true;
        void toggleWindowMaximize();
        return;
      }

      if (!f11Pressed) {
        void toggleWindowMaximize();
        return;
      }

      f11Pressed = false;
    };

    window.addEventListener("keydown", handleShortcutEvent, true);
    window.addEventListener("keyup", handleShortcutEvent, true);

    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleShortcutEvent, true);
      window.removeEventListener("keyup", handleShortcutEvent, true);
    };
  }, []);

  return null;
}
