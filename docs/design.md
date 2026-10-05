# Design System — Kasbon

## 1. Visual intent

A calm, personal finance tool: straightforward hierarchy, compact debt rows, readable totals, and clear actions. Interface copy is casual Indonesian. Design mobile-first, then expand to desktop.

## 2. Strict palette

Use only these four colors throughout the interface. No extra white, black, gray, red, blue, opacity variants, gradients, or browser-default color substitutions.

| Token | Hex | Intended role |
|---|---|---|
| `forest` | `#5C7057` | Primary text on light surfaces, dark surface, focused/active emphasis |
| `sage` | `#89A482` | Primary action, selected states, positive net emphasis |
| `leaf` | `#ACC5A6` | Borders, secondary surface, separators, disabled treatment |
| `mist` | `#D1EDD3` | Main canvas, cards, input surface, text on forest surface |

### Contrast and semantic states

- Use `forest` text on `mist`/`leaf`/`sage` backgrounds; use `mist` text on `forest` backgrounds.
- Use `sage` for primary buttons with `forest` text. Hover/pressed states may swap among palette colors only.
- Keep status meaning explicit in words and icons: “Belum lunas” and “Lunas”.
- The required palette has no red. For negative net, show a visible minus sign and “lebih banyak hutang”/equivalent label, with a palette-only treatment; do not add red.
- Focus indicators must be a visible outline/border using `forest` or `sage`.
- Do not use alpha/opacity to create additional shades. If disabled content needs distinction, use a palette color and a disabled label/icon.

### Palette contrast constraint

This four-color palette does not provide an AA-compliant pair for ordinary-size text: even `forest` on `mist` is approximately 4.29:1, below 4.5:1. The strict palette restriction therefore conflicts with the usual WCAG AA contrast target. Keep the exact requested colors, use the strongest available pairing (`forest` on `mist`) for body text, use larger/bolder text for critical amounts, and avoid low-contrast pairings for essential content. Revisit the palette only if the owner relaxes the four-color-only requirement.

## 3. Design tokens

```css
:root {
  --color-forest: #5c7057;
  --color-sage: #89a482;
  --color-leaf: #acc5a6;
  --color-mist: #d1edd3;
}
```

Tailwind CSS v4 theme values should map directly to these four tokens. Avoid introducing default utility colors (`white`, `gray-*`, `red-*`, etc.).

## 4. Layout and components

- **Page canvas:** `mist`.
- **Header/navigation:** `forest` surface with `mist` text; logo/title and logout action.
- **Summary cards:** `mist` or `leaf` surfaces, `forest` text; prominent amount uses large tabular numerals.
- **Primary action:** `sage` surface and `forest` text; minimum 44px target height.
- **Debt list row/card:** `mist` surface with `leaf` border; stack details on narrow screens and use aligned columns at wider widths.
- **Inputs/selects:** `mist` surface, `forest` text and border; focus outline in `sage`.
- **Dialogs:** use `forest` backdrop only if a backdrop is needed; modal surface `mist`, text `forest`.
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
- Name and amount are required; amount accepts whole Rupiah only and must be greater than zero.
- Date defaults to today; note is optional and limited to 200 characters with a visible count near the limit.
- Validation copy should be brief and in Indonesian. Put errors next to the field and announce them accessibly.
- Disable submit while saving and preserve form input after a recoverable server error.

## 7. Content and formatting

- Currency: Indonesian locale, whole Rupiah, displayed consistently as `Rp 1.234.000`.
- Relative time: Indonesian phrasing, e.g. “hari ini”, “kemarin”, “3 hari lalu”.
- Status: “Belum lunas” / “Lunas”.
- Direction: “Dihutang ke saya” / “Saya hutang”.
- Error copy: explain the next action without exposing internal/database errors.

## 8. Accessibility and interaction

- Meet WCAG AA contrast where possible using only the four palette colors; measure actual token pairs during implementation and adjust role assignments among the four if needed.
- All controls must have keyboard focus, labels, and accessible names.
- Confirm deletion before mutation; provide success/error feedback after mutations.
- Loading state must communicate progress; do not use color alone for status or net sign.
- Respect reduced motion; keep transitions brief and nonessential.
