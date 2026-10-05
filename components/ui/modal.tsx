"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  className?: string;
  layer?: "default" | "high";
};

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  children,
  labelledBy,
  describedBy,
  onClose,
  closeDisabled = false,
  className = "max-w-xl",
  layer = "default",
}: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeDisabledRef = useRef(closeDisabled);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;

    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog) {
        return;
      }

      if (event.key === "Escape" && !closeDisabledRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 ${layer === "high" ? "z-20" : "z-10"} overflow-y-auto bg-ferra p-4 sm:p-6`}
    >
      <div className="flex min-h-full items-center justify-center">
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto ${className} rounded-3xl border-2 border-cashmere bg-linen p-6 text-woody outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-8`}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
