export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const sizes = {
    sm: "size-7 text-[11px]",
    md: "size-8 text-[12px]",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}
