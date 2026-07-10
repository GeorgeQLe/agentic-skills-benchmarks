export function inclusiveRange(start: number, end: number): number[] {
  const step = start <= end ? 1 : -1;
  const values: number[] = [];
  for (let value = start; ; value += step) {
    values.push(value);
    if (value === end) return values;
  }
}
