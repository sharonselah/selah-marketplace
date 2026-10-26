# Design system

Reference: `public/ui.webp`. Clean, airy fintech: one brand colour, soft depth, colour from content.
Tokens live in `src/styles/globals.css`. Use them; don't hand-roll values.

## 1. Colour

- **Chrome is brand-only.** Buttons, nav, tabs, quick-action icons, focus rings: `brand` / `brand-soft` / neutrals. Nothing else.
- **Colour comes from content**, always as a small, contained shape (circle or rounded tile) on white. Every list row gets **one** spot of colour on the left:

| Row is about… | Use |
|---|---|
| An event | `<Cover cover={e.cover} photo={eventPhoto(e.cover)} />`: real crowd/venue photo |
| A venue or business | `<Cover … photo={avatarPhoto(name)} />` or `<Avatar name>` |
| A person or artist | `<Avatar name>` (photo, or an orb with initials) |
| An item with no photo (ticket tier, table, campaign) | `<Orb name>`: lit gradient sphere, hue fixed by name |
| A payment or payout rail | `<PayMark method>`: M-Pesa green, card navy, bank blue, wallet violet (their real colours) |
| A kind of activity (money in/out, device, invoice, queue) | `<IconCircle tone icon>`: pale tint, never loud |

- **Semantic colour means something.** `good` is money in or done. Money out stays `text`, never red. `warn` / `bad` are for real problems only.
- **Highlight with tint, not outline:** `<Card tone="brand">` (your move) or `<Card tone="good">` (done).

## 2. Depth: shadows, not borders

| Token | Use |
|---|---|
| `shadow-card` | Every resting surface (Card, tiles, outline buttons) |
| `shadow-raised` | Hover or lift on clickable cards |
| `shadow-float` | Menus, modals, toasts, bottom nav |

- Cards have **no border**. Separation comes from a white surface on the `bg` page plus `shadow-card`.
- Lists have **no dividers**. Use `flex flex-col gap-1` and row padding.
- Inputs are filled (`bg-surface-2`), not outlined. Focus is a brand ring.
- **Allowed exceptions:** hairline `ring-white/30` on glass buttons over gradients, the dashed upload drop zone, row lines in dense admin tables, and the 1px separator inside dropdown menus.

## 3. Shape

- `rounded-card` (20px): cards, panels, empty states.
- `rounded-tile` (16px): inner tiles, option cards, menus, textareas, cover thumbnails.
- `rounded-full`: buttons, inputs, chips, badges, tabs, icon circles, avatars.
- Nothing else. No `rounded-lg` or `rounded-xl` in new code.

## 4. Type: five sizes, one job each

Fonts: **Montserrat** for h1–h3 (`font-display`), **Nunito** for everything else (`font-sans`, variable weight).

| Class | Size | Use |
|---|---|---|
| `text-display` | 36 / bold | The hero number (balance, total). One per screen. |
| `text-title` | 24 / semibold | Page title (`PageHeader`), stat values |
| `text-heading` | 17 / semibold | Section and card titles (`CardHeader`, modal titles) |
| `text-sm` | 14 | Body, row titles (`font-medium` for the row's name) |
| `text-xs` | 12 | Meta: dates, categories, hints |
| `text-label uppercase` | 11 / tracked | Overline labels ("AVAILABLE BALANCE", table heads) |

- The role classes carry their own weight, so don't add `font-semibold` to them.
- Hierarchy comes from **weight and colour** (`text-text` vs `text-muted`) before size.
- Rows are two lines: name (`text-sm font-medium`), meta under it (`text-xs text-muted`), amount right-aligned and `tabular-nums`.
- Landing page (`app/page.tsx`) may go bigger for marketing; app screens may not.

## 5. Icons

- **Lucide only.** Stroke is 1.75 globally (`svg.lucide` in globals.css). Don't override it.
- Sizes: `size-4` inline and in buttons, `size-5` in nav and headers. Bigger only for empty states.
- Icon in a circle: `grid size-10 place-items-center rounded-full bg-brand-soft text-brand` (or `bg-good-soft text-good` for incoming money, `bg-surface-2 text-muted` for neutral).
- Active nav: the icon stays the same and sits in a `bg-brand-soft` pill.
