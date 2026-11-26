"use client";

import type { TextareaHTMLAttributes } from "react";
import { inputBase } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-24 py-2.5", className)} {...props} />;
}
