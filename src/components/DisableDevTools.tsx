'use client';

import { useEffect } from 'react';

export default function DisableDevTools() {
  useEffect(() => {
    // 1. Disable Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts (F12, View Source, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      const isF12 = e.key === 'F12' || e.keyCode === 123;

      // Ctrl+Shift+I or Cmd+Option+I (DevTools)
      const isDevTools = 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73));

      // Ctrl+Shift+J or Cmd+Option+J (Console)
      const isConsole = 
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
        (e.metaKey && e.altKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74));

      // Ctrl+Shift+C or Cmd+Option+C (Inspect Element)
      const isInspect = 
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
        (e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67));

      // Ctrl+U or Cmd+Option+U (View Source)
      const isViewSource = 
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) ||
        (e.metaKey && e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85));

      if (isF12 || isDevTools || isConsole || isInspect || isViewSource) {
        e.preventDefault();
      }
    };

    // 3. Clear Console / Prevent Console Inspect
    const preventConsole = () => {
      try {
        const dummy = () => {};
        if (process.env.NODE_ENV === 'production') {
          window.console.log = dummy;
          window.console.info = dummy;
          window.console.warn = dummy;
          window.console.error = dummy;
        }
      } catch (err) {
        // Safe fallback
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    preventConsole();

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
