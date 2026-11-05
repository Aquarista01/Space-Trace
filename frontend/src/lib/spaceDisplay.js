const ICON_RULES = [
  { keywords: ["bedroom", "bed room"], icon: "🛏" },
  { keywords: ["living room", "lounge"], icon: "🛋" },
  { keywords: ["workspace", "office", "desk", "study"], icon: "💻" },
  { keywords: ["kitchen"], icon: "🍳" },
  { keywords: ["bathroom"], icon: "🛁" },
  { keywords: ["garage"], icon: "🚗" },
];

export function spaceIcon(name) {
  if (!name) return "📍";
  const text = name.toLowerCase();
  const rule = ICON_RULES.find((r) => r.keywords.some((k) => text.includes(k)));
  return rule ? rule.icon : "📍";
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString()}, ${time}`;
}

export function describeChange(item) {
  if (item.change_type === "appeared") {
    return item.nearest_label_b
      ? `Appeared near the ${item.nearest_label_b}`
      : "Newly detected in this photo";
  }

  if (item.change_type === "disappeared") {
    return item.nearest_label_a
      ? `Was near the ${item.nearest_label_a}`
      : "No longer detected in this photo";
  }

  if (item.change_type === "unchanged") {
    const label = item.nearest_label_b ?? item.nearest_label_a;
    return label ? `Still near the ${label}` : "Position unchanged";
  }

  if (item.change_type === "moved" && item.bbox_a && item.bbox_b) {
    const ax = item.bbox_a.x + item.bbox_a.w / 2;
    const ay = item.bbox_a.y + item.bbox_a.h / 2;
    const bx = item.bbox_b.x + item.bbox_b.w / 2;
    const by = item.bbox_b.y + item.bbox_b.h / 2;
    const dx = bx - ax;
    const dy = by - ay;

    const parts = [];
    if (Math.abs(dx) > 0.05) parts.push(dx > 0 ? "right" : "left");
    if (Math.abs(dy) > 0.05) parts.push(dy > 0 ? "down" : "up");

    const direction = parts.length > 0 ? `Shifted ${parts.join(" and ")}` : "Shifted slightly";
    return item.nearest_label_b ? `${direction}, now near the ${item.nearest_label_b}` : `${direction} in frame`;
  }

  return "";
}