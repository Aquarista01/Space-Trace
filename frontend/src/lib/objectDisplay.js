const ICONS = {
  book: "📕",
  "cell phone": "📱",
  laptop: "💻",
  tv: "📺",
  backpack: "🎒",
  handbag: "👜",
  suitcase: "🧳",
  bicycle: "🚲",
  motorcycle: "🏍️",
  car: "🚗",
  bottle: "🍾",
  cup: "☕",
  person: "🧍",
  bed: "🛏️",
  chair: "🪑",
  couch: "🛋️",
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  clock: "🕐",
  vase: "🏺",
  umbrella: "☂️",
};

export function objectIcon(label) {
  return ICONS[label] ?? "📦";
}

const CATEGORIES = {
  electronics: ["tv", "laptop", "cell phone", "keyboard", "mouse", "remote", "microwave", "oven", "toaster", "refrigerator", "hair drier"],
  personal: ["backpack", "handbag", "suitcase", "umbrella", "book", "bottle", "cup", "wine glass", "scissors", "toothbrush", "teddy bear", "clock", "vase"],
  vehicle: ["bicycle", "car", "motorcycle", "bus", "truck", "train", "airplane", "boat"],
  furniture: ["chair", "couch", "bed", "dining table", "toilet", "potted plant"],
};

export function objectCategory(label) {
  for (const [category, labels] of Object.entries(CATEGORIES)) {
    if (labels.includes(label)) return category;
  }
  return "other";
}

export const CATEGORY_LABELS = {
  all: "All categories",
  electronics: "Electronics",
  personal: "Personal Item",
  vehicle: "Vehicle",
  furniture: "Furniture",
  other: "Other",
};

export function displayName(obj) {
  return obj.display_name || capitalize(obj.label);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatConfidence(value) {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(isoString) {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  return (
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    ", " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function shortSpaceLabel(spaceId) {
  return spaceId ? `Space ${spaceId.slice(0, 8)}` : "Unassigned space";
}