"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className = "button button-dark",
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={className}
      data-pending={pending ? "true" : "false"}
      disabled={disabled || pending}
      type="submit"
    >
      {pending && <LoaderCircle className="button-spinner" size={18} aria-hidden />}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  );
}
