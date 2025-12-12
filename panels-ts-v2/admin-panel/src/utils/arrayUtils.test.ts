import { toArray } from './arrayUtils';

describe('toArray utility', () => {
  test('returns array when input is already an array', () => {
    expect(toArray<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test('returns items property when present', () => {
    const input = { items: [10, 20, 30] };
    expect(toArray<number>(input)).toEqual([10, 20, 30]);
  });

  test('returns data property when present', () => {
    const input = { data: ['a', 'b'] };
    expect(toArray<string>(input)).toEqual(['a', 'b']);
  });

  test('returns fallback when nothing is present', () => {
    expect(toArray<string>(undefined, ['default'])).toEqual(['default']);
  });
  test('handles empty items array', () => {
    const input = { items: [] as number[] };
    expect(toArray<number>(input)).toEqual([]);
  });
  test('handles empty data array', () => {
    const input = { data: [] as string[] };
    expect(toArray<string>(input)).toEqual([]);
  });
  test('handles nullish input gracefully', () => {
    expect(toArray<string>(null as any, ['fallback'])).toEqual(['fallback']);
  });
});


