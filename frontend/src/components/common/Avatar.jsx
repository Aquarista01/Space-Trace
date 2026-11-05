export default function Avatar({ src, name, size = 36 }) {
  const dimension = `${size}px`;

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className="rounded-full object-cover"
        style={{ width: dimension, height: dimension }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-slate-200"
      style={{ width: dimension, height: dimension }}
      aria-hidden
    />
  );
}
