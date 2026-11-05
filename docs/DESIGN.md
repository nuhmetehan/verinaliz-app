---
name: Püre
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414846'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#717976'
  outline-variant: '#c1c8c4'
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
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  risk-safe: '#01261f'
  risk-medium: '#ff781c'
  risk-high: '#ba1a1a'
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
    letterSpacing: 0.05em
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
---

## Brand & Style
The design system is built on the pillars of transparency, clinical precision, and organic vitality. It targets health-conscious consumers who require immediate, trustworthy data visualization while navigating grocery aisles.

The aesthetic follows a **Scientific Minimalism** approach—stripping away decorative clutter to prioritize legibility and data hierarchy. By utilizing expansive whitespace and a structured grid, the interface evokes the feeling of a modern laboratory: clean, efficient, and authoritative. The emotional response is one of "informed calm," replacing the anxiety of chemical additives with the clarity of scientific insight.

## Colors
This design system utilizes a high-contrast palette to communicate product safety instantly.

- **Primary (Deep Forest):** `#01261f` — Used for primary actions, heavy text, and "Safe" status indicators. It provides the grounding, authoritative weight of the brand.
- **Secondary (Mint):** `#416656` — Used for subtle backgrounds, secondary buttons, and success states. It represents freshness and organic quality.
- **Accent (Warning Orange/Red):** Reserved strictly for harmful additives, high-sugar alerts, or allergens. Warning orange `#ff781c` for medium-risk; error red `#ba1a1a` for high risk. These colors maintain high contrast against the off-white background.
- **Neutral (Off-White):** The base surface color (`#f8f9fa`) reduces eye strain and provides a softer, more premium feel than pure white. Cards use pure white `#ffffff` (surfaceContainerLowest) to float above the background.

### Risk Palette
| Level  | Token         | Color                                        |
|--------|---------------|----------------------------------------------|
| Safe   | `risk-safe`   | `#01261f` (Deep Forest) or `#416656` (Mint)  |
| Medium | `risk-medium` | `#ff781c` (Warning Orange)                   |
| High   | `risk-high`   | `#ba1a1a` (Error Red)                        |

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
This design system utilizes a **4px soft-grid** system. The mobile layout is built on a 4-column fluid grid with 20px side margins to ensure content doesn't feel cramped against the screen edges.

- **Scanning Focus:** The primary layout real estate is reserved for the camera viewfinder or the product "Hero Card."
- **Vertical Rhythm:** Use `md` (16px) spacing for related elements and `lg` (24px) for distinct content sections.
- **Safe Areas:** Ensure all actionable buttons (like the Scan button) sit within the bottom-third "thumb zone" for ergonomic mobile use.

## Elevation & Depth
Depth is signaled through **Tonal Layering** and soft, ambient shadows.

- **Level 0 (Surface):** The off-white background `#f8f9fa`.
- **Level 1 (Cards):** Pure white `#ffffff` containers with a 4% opacity black shadow, 8px blur, and 2px Y-offset. This creates a subtle "lift" without looking heavy.
- **Level 2 (Active Elements):** For modals or high-priority alerts, increase the shadow opacity to 8% and blur to 16px with 4px Y-offset.
- **Interaction:** Buttons should appear to depress (lower elevation) when pressed, providing tactile feedback through shadow reduction.

### Shadow Tokens
| Level   | Color | Opacity | Blur | Y-offset |
|---------|-------|---------|------|----------|
| Level 1 | #000  | 4%      | 8px  | 2px      |
| Level 2 | #000  | 8%      | 16px | 4px      |

## Shapes
The shape language is consistently **Rounded**, striking a balance between the precision of a circle and the structure of a square.

- **Standard Elements:** Buttons and input fields use a 12px (`rounded-lg`) corner radius.
- **Containers:** Large product cards and bottom sheets use a 24px (`rounded-xl`) corner radius to feel soft and approachable.
- **Icons:** Use a 2pt stroke weight with rounded caps and joins to match the UI's geometry.

## Components

- **Buttons:** Primary buttons are solid Deep Forest Green `#01261f` with white text. Secondary buttons are Mint Green `#416656` with white text.
- **Status Chips:** Small pills used for nutrition callouts (e.g., "High Protein," "No Sugar"). Use the Secondary Mint for positive traits and Warning Orange for negative ones.
- **Product Cards:** The centerpiece of the analysis. A white card (`#ffffff`) containing a large health score, product image, and a summary list of ingredients, elevated over the `#f8f9fa` background.
- **Scanning HUD:** A minimal, centered square bracket icon in the viewfinder that pulses subtly when a barcode is detected.
- **Ingredient Lists:** Lists should use high-contrast `#191c1d` text with "Warning" ingredients highlighted in a soft red background `#ffdad6` with dark red text `#93000a` for maximum visibility.
- **Input Fields:** Clean, white boxes with a subtle 1px border in `#c1c8c4` (outlineVariant). Focus states should shift the border to Primary Green `#01261f`.
- **Tab Bar:** Light semi-transparent / white background, `#e7e8e9` border, soft ambient shadow. Active tab color `#01261f` (Deep Forest); inactive `#717976` (outline).
