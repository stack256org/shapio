import { countCharacters } from "@/lib/text-metrics";

// Zod `.min(n)`/`.max(n)` on a string checks its raw length — leading/
// trailing whitespace, repeated internal spaces, and padding all count
// toward the limit exactly like real content. These refinements check the
// same whitespace-normalized count `countCharacters` uses for every live
// counter, so a field's max length can only be reached with actual content,
// and the server enforces the exact same limit the UI displays.
export function maxMeaningfulLength(max: number) {
  return (value: string) => countCharacters(value) <= max;
}

export function minMeaningfulLength(min: number) {
  return (value: string) => countCharacters(value) >= min;
}
