// Demo topics ("话题") — the grouping concept behind the sidebar's topic view.
import type { Topic } from '../types';

export const TOPICS: Topic[] = [
  { id: 'gold', name: '黄金 · 投资', icon: 'coins', color: '#d4a64a', soft: '#f9efd6' },
  { id: 'edu', name: '孩子教育', icon: 'book', color: '#635bff', soft: '#efeefe' },
  { id: 'brief', name: '每日早报', icon: 'news', color: '#ff6a3d', soft: '#fff0e8' },
  { id: 'health', name: '健康 · 运动', icon: 'heart', color: '#1a7f55', soft: '#e2f3eb' },
];

export function topicById(id: string | null | undefined): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Short display name of a topic (text before the " · " separator). */
export function topicShortName(t: Topic): string {
  return t.name.split(' · ')[0];
}
