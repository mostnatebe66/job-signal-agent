import { createHash } from 'node:crypto';

export function stableHash(input: string): string {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex').slice(0, 16);
}
