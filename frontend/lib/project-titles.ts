const KEY = "amity_project_titles";

export function getProjectTitle(address: string): string | null {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return null;
    return JSON.parse(stored)[address.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export function saveProjectTitle(address: string, title: string): void {
  try {
    const stored = localStorage.getItem(KEY);
    const map: Record<string, string> = stored ? JSON.parse(stored) : {};
    map[address.toLowerCase()] = title;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}
