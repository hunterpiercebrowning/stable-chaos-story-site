export type ClassValue = string | number | bigint | boolean | null | undefined;

/** Tiny class-name joiner; falsy values are dropped. */
export function cn(...values: ClassValue[]): string {
  return values.filter((v): v is string => typeof v === 'string' && v.length > 0).join(' ');
}
