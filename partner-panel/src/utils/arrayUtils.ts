export function toArray<T>(input: any, fallback: T[] = []): T[] {
  if (Array.isArray(input)) {
    return input;
  }
  if (input && Array.isArray(input.items)) {
    return input.items;
  }
  if (input && Array.isArray(input.data)) {
    return input.data;
  }
  return fallback;
}



