"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

export function DemoActionButton({
  label,
  doneLabel,
  tone = "default",
}: {
  label: string;
  doneLabel: string;
  tone?: "default" | "danger";
}) {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  function act() {
    if (state !== "idle") return;
    setState("saving");
    window.setTimeout(() => setState("done"), 450);
  }

  return (
    <button
      className={`table-action ${tone === "danger" ? "is-danger" : ""}`}
      disabled={state !== "idle"}
      onClick={act}
      type="button"
    >
      {state === "saving" && (
        <LoaderCircle className="spin" size={13} aria-hidden />
      )}
      {state === "done" && <Check size={13} aria-hidden />}
      {state === "done" ? doneLabel : label}
    </button>
  );
}
