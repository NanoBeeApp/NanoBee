# Research Canvas UI & Interaction Issue List

> **Review subject:** NanoBee Research Canvas interface (three-column layout: left navigation / center research content / right quick chat)
> **Review method:** Claude Opus multimodal image analysis + `impeccable critique` design standards + repository style-review 12-item checklist
> **Review date:** 2026-06-14
> **Source screenshot:** `screenshots/design-review/research-canvas/research-canvas-overview.png`
> **Related source:** `src/research/`, `src/components/research/`, `src/worker/research/`

---

## 1. Design Health (Nielsen 10 Heuristics)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 2 | "Collapsed / Expanded" state labels are semantically ambiguous; no indication of reading progress among 27 nodes |
| 2 | Match between system and the real world | 2 | Named "Research Canvas" yet rendered as a vertical nested list — the canvas metaphor does not match the reality |
| 3 | User control and freedom | 2 | Deep nesting with no "Collapse All / Focus Mode"; reading a deep node requires scrolling past everything above |
| 4 | Consistency and standards | 2 | Two accent colors (purple + orange) with no systematic role; New Chat has ⌘N, New Research has no keyboard shortcut |
| 5 | Error prevention | 3 | No obvious high-risk operations visible; acceptable |
| 6 | Recognition rather than recall | 2 | "Click to read / Continue reading" has low affordance; no disclosure chevrons |
| 7 | Flexibility and efficiency | 2 | 27 nodes with no overview, minimap, or breadcrumbs — pure linear scrolling |
| 8 | Aesthetic and minimalist design | 1 | Main content rendered as individual cards + nested cards + dot-grid texture background, violating the minimalism rule |
| 9 | Help users recognize, diagnose, and recover from errors | 3 | No error states visible in the screenshot; reasonably acceptable |
| 10 | Help and documentation | 2 | Right-column empty state has no example prompts or guidance; new users have no idea what they can ask |
| **Total** | | **21/40** | **Below passing; structural issues concentrated in card layout, focus, and the canvas metaphor** |

---

## 2. Anti-Pattern Verdicts (AI slop / impeccable absolute bans)

| Level | Anti-Pattern | Notes |
|-------|--------------|-------|
| 🔴 Absolute ban hit | **Nested cards** | The "Louis de Broglie" card is nested inside the "From Classical Particles to Quantum Clouds" card, with each deeper level indented further. impeccable explicitly states "nested cards are always wrong"; the repository rule also bans "turning every item into a card with nesting" |
| 🔴 Rule violation | **Card-ified main content** | Every node in the center column is a self-contained card with a border and shadow. Should be replaced with a Twitter-style flat list differentiated only by very subtle dividers or spacing |
| 🟡 Decorative noise | **Dot-grid texture background** | The center column uses a decorative dot-grid background — visual noise that competes with reading the main content without conveying any information |
| 🟡 Missing system | **Dual accent colors with no semantic division** | Purple (Research Canvas selection state / "5" badge) and orange (bee logo / quick chat icon) appear simultaneously with no clear semantic roles assigned |

Overall the design does not feel blatantly AI-generated, but the stacked cards and dot-grid background are typical AI back-office styling inertia.

---

## 3. Style-Review 12-Item Checklist — Item-by-Item Results

### Item 1: Container Padding — ❌ Fail
- ✅ Card padding is approximately symmetric and adequate on all sides (≈20–24 px)
- ✅ ≥12 px
- ✅ No content flush against any edge
- ❌ Nested padding hierarchy: the inner card padding is too close to the outer card padding; nesting hierarchy is not communicated through indentation + whitespace, making it feel cramped

### Item 2: Text-to-Edge Clearance — ✅ Pass
- ✅ Body text has adequate margins on all sides | ✅ No flush edges | ✅ Right-column input has sufficient padding | ✅ List-item text spacing is comfortable | ✅ Input field padding is adequate

### Item 3: Type Scale & Hierarchy (including weight) — ❌ Fail
- ✅ Main heading "Introduction to Quantum Mechanics" is a reasonable size, not oversized
- ✅ Supporting text ≥12 px | ✅ Same-level card headings are consistent in size | ✅ Hierarchy size differences are reasonable
- ❌ Weight: the distinction between node headings (bold) and body (regular) is acceptable, but the "Collapsed / Expanded" status labels and the "Research Direction" eyebrow text are too close in size and weight to secondary body text — they are not sufficiently de-emphasized and can be confused with body copy

### Item 4: Multi-Line Text Line Height — ✅ Pass
- ✅ Body line height ≈1.6, comfortable | ✅ Heading line height reasonable | ✅ Multi-line list items comfortable | ✅ Consistent line height across sections

### Item 5: Text Color & Contrast — ❌ Fail
- ✅ Main heading is dark enough | ✅ Body text is legible
- ❌ Supporting text is too faint: "Collapsed / Expanded", "Click to read / Continue reading", "27 nodes" are all at a gray level near the WCAG AA boundary, making interactive affordances unreadable
- ❌ Link differentiation: "Click to read" as an interactive action uses no accent color — it is indistinguishable from ordinary gray text, providing insufficient affordance
- ✅ Colors within the same semantic role are largely consistent

### Item 6: Element Alignment — ❌ Fail
- ✅ Center-column cards share a left edge
- ❌ Nested cards break the vertical left-edge alignment (inner cards shift right), creating a jagged visual column
- ❌ Three-column top baselines are misaligned: the left logo, the center "Research Direction" heading, and the right "Quick Chat" start at different heights
- ❌ The "W" avatar dropdown floats in the upper-center-right area with no clear container or header bar ownership — its position is ambiguous
- ✅ Icons are vertically centered with their text | ✅ Card widths are consistent

### Item 7: Visual Consistency — ❌ Fail
- ❌ Color: purple and orange dual accent colors have no unified semantic division
- ✅ Typeface is consistent | ✅ Spacing system is broadly consistent | ✅ Component styles are consistent | ✅ Border radii are consistent
- ❌ Shadow: every node card carries a shadow; the shadow level between floating elements and base-layer cards is not differentiated — shadows are insufficiently restrained
- ✅ Icon style is consistent (outlined)
- ⚠️ Interaction states cannot be fully assessed from a static screenshot

### Item 8: Visual Weight & Focus — ❌ Fail
- ❌ Multiple focal points: the top "Why does quantum mechanics resemble a probability game?" (white highlighted card) competes with the gray cards below; there is no single dominant focal point
- ❌ Hierarchy degradation is unclear: nested cards use indentation rather than visual weight to communicate depth
- ❌ Over-decoration: dot-grid background + per-card shadows + multiple borders
- ❌ Border / divider overuse: nearly every node is wrapped in a bordered container, far exceeding the "≤3" guideline
- ❌ No background-color gradient used to delineate regions — relies entirely on card borders
- ❌ Risk of redundant background + border (gray-background cards also have an outline)
- ⚠️ Supporting-area de-emphasis is insufficient (see Item 5)

### Item 9: Spacing & Breathing Room — ✅ Pass
- ✅ No elements flush to edges | ✅ Text and icons are not cramped | ✅ Line spacing is comfortable | ✅ List-item spacing is comfortable | ✅ Outer margins are reasonable | ✅ Between-section spacing > within-section spacing | ✅ Heading-to-body spacing is adequate | ✅ No wall-of-text density (spacing itself is handled well)

### Item 10: Buttons & Interactive Elements — ❌ Fail
- ✅ Left-nav button hit targets are large enough | ✅ Padding is adequate
- ❌ Primary vs. secondary button distinction: "New Chat" and "New Research" have similar visual weight; the primary action is not prominent
- ❌ "Click to read / Continue reading" is the core interaction entry point yet has a small hit target and insufficient visual weight
- ✅ The send button in the bottom-right is readable

### Item 11: Images & Media — ✅ Pass
- ✅ Bee logo / mascot is sharp with no distortion | ✅ Resolution is crisp | ✅ No broken images | ✅ Surrounding spacing is adequate

### Item 12: Empty States & Edge Cases — ❌ Fail
- ❌ The right-column "Quick Chat" empty state shows only the mascot and a single line of text, with no example prompts or suggested actions — new users have no idea what they can ask or how to "keep tabs on something"
- ✅ Long body text shows no overflow
- ⚠️ Truncation behavior for very long node titles on narrow screens cannot be assessed from this screenshot

**12-item summary:** 4 items pass (2 / 4 / 9 / 11), 8 items fail (1 / 3 / 5 / 6 / 7 / 8 / 10 / 12).

---

## 4. Issue List (P0–P3 Priority)

### [P0] Main content "card layout + nested cards"
- **Why:** This triggers impeccable's absolute ban and the repository rule against "turning every item into a card with nesting." Each additional level of nesting becomes narrower, wasting horizontal space, breaking left-edge alignment, and shrinking the content viewport.
- **Fix:** Replace nodes with a **flat outline** — remove borders and shadows; express parent–child relationships through "hierarchical indent guides (1 px, very subtle) + spacing + type size / weight gradient." Separate same-level nodes with only a very faint divider or pure whitespace (reference: Notion / outline view).
- **Suggested commands:** `/impeccable distill` → `/impeccable layout`

### [P1] "Research Canvas" name–reality mismatch + no structural overview
- **Why:** Named a canvas but implemented as linear nested scrolling. 27 nodes have no overview, minimap, or breadcrumbs; reaching a deep node requires scrolling past everything, at high navigation cost.
- **Fix:** Either implement a true canvas (2D node graph / mind map), or rename the view to "Research Outline" and add a **collapsible left-sidebar tree / top-of-page breadcrumb path / Collapse All** control.
- **Suggested command:** `/impeccable shape` (settle on the metaphor first)

### [P2] Missing focus + over-decoration (dot-grid background / stacked shadows / dual accent colors)
- **Why:** The white highlighted card and the gray cards below create multiple focal points; the dot-grid texture competes with reading; purple and orange have no semantic division.
- **Fix:** Remove the dot-grid background and use a clean background; use **background-color gradients (same palette, 1–2 steps)** rather than borders to delineate regions; establish a single primary accent color (recommended: keep brand orange as the accent, demote or merge purple); indicate the currently active reading node with a left-side accent cursor rather than full-card highlighting.
- **Suggested commands:** `/impeccable quieter` → `/impeccable colorize`

### [P3] Interaction discoverability + ambiguous state semantics
- **Why:** "Collapsed / Expanded" and "Click to read / Continue reading" overlap in meaning and are both too faint — why does an already-expanded node still say "Continue reading"? There are no disclosure chevrons; the click entry point uses no accent color and has a small hit target.
- **Fix:** Consolidate into a single visible control — add a chevron (▸ / ▾) before each node to express collapsed / expanded state, and remove the text-based status labels. Make "Read" an accent-colored text link with an adequate hit target; the entire row should be clickable.
- **Suggested commands:** `/impeccable clarify` → `/impeccable layout`

### [P3] Right-column empty state provides no onboarding
- **Why:** The "Quick Chat" empty state carries zero useful information, creating a high cold-start barrier.
- **Fix:** Add 3–4 example prompt bubbles (e.g. "Summarize this research direction for me", "Keep tabs on new arXiv papers") to lower the cold-start barrier.
- **Suggested command:** `/impeccable onboard`

---

## 5. Persona Red Flags

- **Jordan (new user):** Lands on a screen of 27 nested cards with no sense of where to start; "Collapsed / Expanded" labels are opaque; the empty chat panel provides no guidance on what to ask → high risk of first-screen drop-off.
- **Alex (power user):** No "Collapse All / Focus Mode," no keyboard shortcut for jumping to a node; New Research has no shortcut while New Chat has ⌘N → efficiency is impaired.

---

## 6. Conclusion & Next Steps

**Conclusion: changes required.** Spacing, line height, and baseline readability (Items 2 / 4 / 9 / 11) are handled well, but there are P0 / P1 issues at the **structural layer (nested cards), focus layer (multiple focal points + over-decoration), and interaction layer (canvas metaphor + state semantics)**.

**Confirmed highest-priority direction: structural layer (P0)** — remove card-ification from the main content and switch to a flat outline. P1–P3 items to follow in order.

**After the fix:** re-screenshot + multimodal review against this checklist item by item; confirm all 12 items pass and the health score has recovered.

---

## Change History

### 2026-06-14 — Created
- **Context:** The user provided a screenshot of the Research Canvas interface and requested a UI and interaction diagnosis compiled into a reference document.
- **Goal:** Distill a one-off screenshot review into a trackable design-review document to serve as the basis for subsequent refactoring (structural layer first).
- **Key decision:** Adopted a three-part structure — "Nielsen health score + impeccable anti-pattern verdicts + repository 12-item checklist" — with issues sorted P0–P3 and annotated with corresponding fix commands for priority-driven execution.
