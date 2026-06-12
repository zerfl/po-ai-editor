import type { PoComment, PoEntry } from './types/po.js';

export type PoCatalogKey = string;

function uniquePreservingOrder(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }

  return unique;
}

export function getPoEntryKey(entry: Pick<PoEntry, 'msgctxt' | 'msgid'>): PoCatalogKey {
  return JSON.stringify([entry.msgctxt, entry.msgid]);
}

export function splitPoLines(value?: string): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinPoLines(lines: Iterable<string>): string | undefined {
  const unique = uniquePreservingOrder(
    Array.from(lines, (line) => line.trim()).filter((line) => line.length > 0),
  );

  return unique.length > 0 ? unique.join('\n') : undefined;
}

export function mergePoLineValues(...values: Array<string | undefined>): string | undefined {
  return joinPoLines(values.flatMap((value) => splitPoLines(value)));
}

export function splitReferenceComment(reference?: string): string[] {
  return splitPoLines(reference);
}

export function joinReferenceComment(lines: Iterable<string>): string | undefined {
  return joinPoLines(lines);
}

export function mergeReferenceComments(...values: Array<string | undefined>): string | undefined {
  return joinReferenceComment(values.flatMap((value) => splitReferenceComment(value)));
}

export function splitFlagComment(flag?: string): string[] {
  if (!flag) return [];
  return flag
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function joinFlagComment(flags: Iterable<string>): string | undefined {
  const unique = uniquePreservingOrder(
    Array.from(flags, (flag) => flag.trim()).filter((flag) => flag.length > 0),
  );

  return unique.length > 0 ? unique.join(', ') : undefined;
}

export function mergeFlagComments(...values: Array<string | undefined>): string | undefined {
  return joinFlagComment(values.flatMap((value) => splitFlagComment(value)));
}

export function withPoCommentDefaults(comment?: Partial<PoComment>): PoComment {
  return {
    translator: comment?.translator,
    extracted: comment?.extracted,
    reference: comment?.reference,
    flag: comment?.flag,
    previous: comment?.previous,
  };
}
