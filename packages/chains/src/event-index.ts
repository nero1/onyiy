export function selectEventIndex(observations: (number[] | null)[]) {
  const lists = observations.filter(
    (value): value is number[] => value !== null,
  );
  if (!lists.length) return undefined;
  if (lists.some((v) => v.length > 1)) throw new Error("AMBIGUOUS_TRANSFER");
  if (lists.some((v) => JSON.stringify(v) !== JSON.stringify(lists[0])))
    return undefined;
  return lists[0][0];
}
