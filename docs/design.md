# Design System — Kasbon

## 1. Visual intent

A calm, personal finance tool: straightforward hierarchy, compact debt rows, readable totals, and clear actions. Interface copy is casual Indonesian. Design mobile-first, then expand to desktop.

## 2. Warm palette

Use these five colors throughout the interface. No extra white, black, gray, red, blue, opacity variants, gradients, or browser-default color substitutions.

| Token | Hex | Intended role |
|---|---|---|
| `woody` | `#3E2A28` | Primary text, header surface, focused/active emphasis |
| `ferra` | `#6C4F4B` | Destructive actions and dialog backdrop |
| `toast` | `#A4685B` | Primary actions and active accents |
| `cashmere` | `#E2B8A1` | Borders, selected surfaces, feedback, and disabled treatment |
| `linen` | `#F9E9D7` | Main canvas, cards, input surfaces, and text on dark surfaces |

### Contrast and semantic states

- Use `woody` text on `linen`/`cashmere`/`toast` backgrounds; use `linen` text on `woody` and `ferra` backgrounds.
- Use `toast` for primary buttons with `woody` text. Hover/pressed states may swap among palette colors only.
- Keep status meaning explicit in words and icons: “Belum lunas” and “Lunas”.
- The required palette has no red. For negative net, show a visible minus sign and “lebih banyak hutang”/equivalent label, with a palette-only treatment; do not add red.
- Focus indicators must be a visible outline/border using `woody` or `toast`.
- Do not use alpha/opacity to create additional shades. If disabled content needs distinction, use a palette color and a disabled label/icon.

## 3. Design tokens

```css
:root {
  --color-woody: #3e2a28;
  --color-ferra: #6c4f4b;
  --color-toast: #a4685b;
  --color-cashmere: #e2b8a1;
  --color-linen: #f9e9d7;
}
```

Tailwind CSS v4 theme values should map directly to these five tokens. Avoid introducing default utility colors (`white`, `gray-*`, `red-*`, etc.).

## 4. Layout and components

- **Page canvas:** `linen`.
- **Header/navigation:** `woody` surface with `linen` text; logo/title and logout action.
- **Summary cards:** `cashmere` surfaces with `woody` text; prominent amount uses large tabular numerals.
- **Primary action:** `toast` surface and `woody` text; minimum 44px target height.
- **Debt list row/card:** `linen` surface with `cashmere` border; stack details on narrow screens and use aligned columns at wider widths.
- **Inputs/selects:** `linen` surface, `woody` text, and `cashmere` border; focus outline in `woody`.
- **Dialogs:** use `ferra` backdrop; modal surface `linen`, text `woody`.
- **Icons:** Lucide React, sized consistently; icons reinforce labels rather than replacing accessible text.

## 5. Dashboard hierarchy

1. Page heading “Catatan kasbon” and “+ Catat baru”.
2. Three summary cards: “Dihutang ke saya”, “Saya hutang”, “Net”.
3. Status and type filters.
4. Debt entries with name, type, amount, relative date, status, and actions.
5. Empty state with short casual Indonesian copy and a create action.

At mobile width, summary cards can be a two-column grid with Net spanning full width; filters wrap or stack; each entry becomes a single-column card. Avoid tiny inline action buttons.

## 6. Form behavior

- Use radio cards for “Saya dihutang” and “Saya hutang”.
- Show labels, not placeholder-only instructions.
- Name and amount are required; amount accepts whole Rupiah only, shows a static `Rp` prefix and live thousands grouping, and must be greater than zero.
- Date defaults to today and is entered as `dd/mm/yyyy`; note is optional and limited to 200 characters with a visible count near the limit.
- Validation copy should be brief and in Indonesian. Put errors next to the field and announce them accessibly.
- Disable submit while saving and preserve form input after a recoverable server error.

## 7. Content and formatting

- Currency: Indonesian locale, whole Rupiah, displayed consistently as `Rp 1.234.000`.
- Relative time: Indonesian phrasing, e.g. “hari ini”, “kemarin”, “3 hari lalu”.
- Status: “Belum lunas” / “Lunas”.
- Direction: “Dihutang ke saya” / “Saya hutang”.
- Error copy: explain the next action without exposing internal/database errors.

## 8. Accessibility and interaction

- Meet WCAG AA contrast where possible using only the five palette colors; measure actual token pairs during implementation and adjust role assignments among them if needed.
- All controls must have keyboard focus, labels, and accessible names.
- Confirm deletion before mutation; provide success/error feedback after mutations.
- Loading state must communicate progress; do not use color alone for status or net sign.
- Respect reduced motion; keep transitions brief and nonessential.
