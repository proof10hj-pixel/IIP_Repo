export function BadgeTag({
  label,
  tone = "gray",
}: {
  label: string;
  tone?: "blue" | "yellow" | "red" | "gray";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-100 text-blue-700"
      : tone === "yellow"
      ? "bg-yellow-100 text-yellow-700"
      : tone === "red"
      ? "bg-red-100 text-red-700"
      : "bg-gray-200 text-gray-700";

  return (
    <span className={`px-2 py-1 text-xs rounded ${toneClass}`}>
      {label}
    </span>
  );
}