// Monotonic id generator for client-side entities (messages, tasks, toasts).
let uid = 1000;

export function nextId(prefix = 'm'): string {
  uid += 1;
  return `${prefix}_${uid}`;
}
