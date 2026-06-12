// Collision-resistant id generator for client-created entities
// (chats, messages, tasks, toasts). Ids are persisted to D1, so they must
// stay unique across sessions and devices — hence nanoid, not a counter.
import { nanoid } from 'nanoid';

export function nextId(prefix = 'm'): string {
  return `${prefix}_${nanoid(10)}`;
}
