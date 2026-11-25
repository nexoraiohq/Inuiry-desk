"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

const inputBase =
  "w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-subtle " +
  "transition-colors outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(inputBase, className)} {...props} />;
}

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>;

/** Password field with a keyboard-accessible show/hide toggle. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(inputBase, "pr-11", className)}
        aria-invalid={props["aria-invalid"]}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-subtle transition-colors hover:text-ink"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

type FieldProps = {
  label: string;
  /** Validation message rendered under the control and announced politely. */
  error?: string;
  hint?: ReactNode;
  /** A single Input or PasswordInput. */
  children: ReactNode;
};

/** Label + control + validation message, wired up for screen readers. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const only = Children.only(children);
  const control = isValidElement(only)
    ? cloneElement(only as React.ReactElement<InputProps>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })
    : only;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
