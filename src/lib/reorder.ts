/**
 * Return a new array with `moved` repositioned to where `target` currently is.
 *
 * Moving an item down places it after the target; moving it up places it
 * before the target. Returns the original array unchanged when either item is
 * missing or they are the same.
 */
export function reorderList<T>(list: T[], moved: T, target: T): T[] {
  const from = list.indexOf(moved);
  const to = list.indexOf(target);
  if (from === -1 || to === -1 || from === to) return list;
  const next = list.filter((item) => item !== moved);
  next.splice(to, 0, moved);
  return next;
}
