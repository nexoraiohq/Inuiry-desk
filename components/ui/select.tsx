"use client";

import type { SelectHTMLAttributes } from "react";
import { inputBase } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/** Native select styled to match Input, with keyboard and screen-reader support. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}
