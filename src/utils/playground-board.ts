export function swapBoardItems<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

export function placeLibraryItem<T>(items: T[], item: T, targetIndex: number | undefined, maxItems: number) {
  if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < items.length) {
    const next = [...items];
    next[targetIndex] = item;
    return next;
  }

  return items.length < maxItems ? [...items, item] : items;
}
