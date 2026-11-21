---
name: Püre
colors:
  surface: '#f6f8f7'
  surface-dim: '#d9dadb'
  surface-bright: '#f6f8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#495a52'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#5b6c64'
  outline-variant: '#c4d0c9'
  surface-tint: '#43655c'
  primary: '#01261f'
  on-primary: '#ffffff'
  primary-container: '#1a3c34'
  on-primary-container: '#83a69c'
  inverse-primary: '#aacec3'
  secondary: '#416656'
  on-secondary: '#ffffff'
  secondary-container: '#c3ecd7'
  on-secondary-container: '#476c5b'
  tertiary: '#3c1500'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e2500'
  on-tertiary-container: '#ff781c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5eadf'
  primary-fixed-dim: '#aacec3'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#2b4d44'
  secondary-fixed: '#c3ecd7'
  secondary-fixed-dim: '#a8cfbc'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#294e3f'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#f6f8f7'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  risk-safe: '#01261f'
  risk-medium: '#735300'
  risk-high: '#ba1a1a'
  risk-safe-surface: '#e1efe7'
  risk-medium-surface: '#fff0b8'
  risk-high-surface: '#fceae8'
  header-surface: '#edf4f0'
  selected-surface: '#e1efe7'
  divider: '#dbe4df'
  camera-surface: '#0d211b'
typography:
  headline-lg:
    fontFamily: PlusJakartaSans_700Bold
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: PlusJakartaSans_700Bold
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: PlusJakartaSans_600SemiBold
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: PlusJakartaSans_600SemiBold
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter_400Regular
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter_400Regular
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter_400Regular
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter_600SemiBold
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.15px
  action:
    fontFamily: Inter_600SemiBold
    fontSize: 14px
    lineHeight: 20px
  data-display:
    fontFamily: Inter_700Bold
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 12px
  touch-target: 48px
---

## Brand & Style
The design system is built on the pillars of transparency, clinical precision, and organic vitality. It targets health-conscious consumers who require immediate, trustworthy data visualization while navigating grocery aisles.

The aesthetic follows a **Scientific Minimalism** approach—stripping away decorative clutter to prioritize legibility and data hierarchy. By utilizing expansive whitespace and a structured grid, the interface evokes the feeling of a modern laboratory: clean, efficient, and authoritative. The emotional response is one of "informed calm," replacing the anxiety of chemical additives with the clarity of scientific insight.

## Colors
This design system utilizes a high-contrast palette to communicate product safety instantly.

- **Primary (Deep Forest):** `#01261f` — Used for primary actions, heavy text, and "Safe" status indicators. It provides the grounding, authoritative weight of the brand.
- **Secondary (Mint):** `#416656` — Used for subtle backgrounds, secondary buttons, and success states. It represents freshness and organic quality.
- Dark amber `#735300` on pale yellow `#fff0b8` indicates medium risk. Red `#ba1a1a` on pale pink `#fceae8` indicates high risk. Pair each color with a visible label in guide rows and result badges.
- **Surfaces:** Pale green-gray `#f6f8f7` separates white cards from the page. Use `#edf4f0` for headers and summary panels, and `#e1efe7` for selected controls. Neutral gray remains available for passive surfaces. Use `#dbe4df` for dividers and `#5b6c64` where a control needs a stronger outline.

### Risk Palette

| Level  | Token         | Foreground | Surface |
|--------|---------------|------------|---------|
| Low concern | `risk-safe` | `#01261f` | `#e1efe7` |
| Controversial | `risk-medium` | `#735300` | `#fff0b8` |
| High concern | `risk-high` | `#ba1a1a` | `#fceae8` |

## Typography
The typography strategy pairs **Plus Jakarta Sans** for headlines with **Inter** for all functional and data-heavy content.

- **Headlines:** Plus Jakarta Sans 600/700 — tighter letter-spacing and bold weights establish a strong hierarchy.
- **Body:** Inter 400/600/700 — chosen for its exceptional legibility in small sizes, crucial for reading long ingredient lists.
- **Data Display:** A specific large-format Inter 700 style is used for "Health Scores" (0–100) to ensure the primary takeaway of a scan is unavoidable.
- **Accessibility:** Minimum body text is set to 14px to ensure readability for users of all ages in varied lighting conditions.

### Font Tokens
| Style              | Font                        | Size | Weight | Line Height |
|--------------------|-----------------------------|------|--------|-------------|
| headline-lg        | PlusJakartaSans_700Bold      | 32   | 700    | 40          |
| headline-lg-mobile | PlusJakartaSans_700Bold      | 26   | 700    | 32          |
| headline-md        | PlusJakartaSans_600SemiBold  | 24   | 600    | 30          |
| headline-sm        | PlusJakartaSans_600SemiBold  | 20   | 600    | 26          |
| body-lg            | Inter_400Regular             | 18   | 400    | 28          |
| body-md            | Inter_400Regular             | 16   | 400    | 24          |
| body-sm            | Inter_400Regular             | 14   | 400    | 20          |
| label-md           | Inter_600SemiBold            | 12   | 600    | 16          |
| data-display       | Inter_700Bold                | 48   | 700    | 48          |

## Layout & Spacing
This design system utilizes a **4px soft-grid** system. Mobile layouts use 20px side margins and 48px minimum touch targets. Controls and content rows can grow with system text. Analysis tabs and nutrient grids stack on narrow screens or at large font sizes.

- **Scanning Focus:** The primary layout real estate is reserved for the camera viewfinder or the product "Hero Card."
- **Vertical Rhythm:** Use 8–12px between related elements, and 16–24px between distinct content sections.
- **Safe Areas:** Keep the labeled scan destination in the bottom navigation and respect system gesture insets.

## Elevation & Depth
Depth is signaled through **Tonal Layering** and soft, ambient shadows.

- **Level 0 (Surface):** The off-white background `#f6f8f7`.
- **Level 1 (Cards):** Pure white `#ffffff` containers with a 4% opacity black shadow, 8px blur, and 2px Y-offset. This creates a subtle "lift" without looking heavy.
- **Level 2 (Active Elements):** For modals or high-priority alerts, use a soft shadow with an offset. In lists, a subtle border or low elevation is sufficient.
- **Interaction:** Use a distinct pressed fill on action buttons and navigation controls.

### Shadow Tokens
| Level   | Color | Opacity | Blur | Y-offset |
|---------|-------|---------|------|----------|
| Level 1 | #000  | 4%      | 8px  | 2px      |
| Level 2 | #000  | 8%      | 16px | 4px      |

## Shapes
The shape language is consistently **Rounded**, striking a balance between the precision of a circle and the structure of a square.

- **Standard Elements:** Buttons and input fields use a 12px (`rounded-lg`) corner radius.
- **Containers:** Cards use a 16px radius. Use 24px on large containers such as the camera preview and modal sheets.
- **Icons:** Use a 2pt stroke weight with rounded caps and joins to match the UI's geometry.

## Components

- **Buttons:** Primary buttons are solid Deep Forest Green `#01261f` with white text. Secondary buttons are Mint Green `#416656` with white text.
- **Status Chips:** Small pills used for nutrition callouts (e.g., "High Protein," "No Sugar"). Use the Secondary Mint for positive traits and Warning Orange for negative ones.
- **Product Details:** Group the image, name, brand and barcode. Follow with allergen information and source-provided Nutri-Score or NOVA, then ingredients and nutrition.
- **Scanning HUD:** Frame the barcode with mint corners on the camera preview. Place instructions and live status on an opaque surface beside the preview.
- **Ingredient Lists:** Lists should use high-contrast `#191c1d` text with "Warning" ingredients highlighted in a soft red background `#ffdad6` with dark red text `#93000a` for maximum visibility.
- **Input Fields:** White fields use the stronger outline where the border is needed to identify the control. Preserve the native cursor and keyboard focus.
- **Tab Bar:** White surface with a fine divider. Keep “Tara” filled in deep forest and use the selected surface on the active secondary tab.
