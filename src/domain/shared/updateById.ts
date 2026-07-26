export function updateById<T extends { id: string }>(list: T[], id: string, changes: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...changes } : item));
}
