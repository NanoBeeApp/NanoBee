// Deterministic topic classifier (zero LLM). Maps a free-text FeedQuery topic to
// a coarse class id used today as the data view's `topic_id` (for future
// today-feed grouping) and later as part of the AI card-template cache
// signature. Pure function so the same topic always yields the same class.

const RULES: Array<{ class: string; re: RegExp }> = [
  { class: "ai", re: /\b(ai|llm|gpt|genai|ml|agent)\b|大模型|人工智能|机器学习|生成式|智能体/i },
  { class: "dev", re: /\b(dev|developer|code|coding|programming|rust|python|javascript|typescript|golang|kubernetes|开源)\b|开发者|编程|程序员/i },
  { class: "finance", re: /\b(fed|rate|interest|stock|crypto|bitcoin|nasdaq|earnings)\b|美联储|利率|股市|加密|金融|财经|黄金/i },
  { class: "news", re: /\b(news|headline|politics|world)\b|新闻|时事|头条/i },
];

/** Classify a topic string into a coarse, stable class id. */
export function classifyTopic(topic: string): string {
  const t = (topic ?? "").trim();
  if (!t) return "general";
  for (const r of RULES) if (r.re.test(t)) return r.class;
  return "general";
}
