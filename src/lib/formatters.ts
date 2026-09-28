export function formatTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 19);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function eventLabel(seq: number): string {
  return `EVT-${String(seq).padStart(4, "0")}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
