# AdvanceWeekly Design System

## Brand Identity
**Product Name:** AdvanceWeekly
**Tagline:** See beyond the busy.
**Mission:** Transform weekly work into meaningful insights with AI-powered performance assessments.

## Design Tokens

### Colors
```css
/* Light Mode (Default) */
--color-primary-600: #174E7A;   /* Deep blue - brand text & headlines */
--color-primary-100: #E5EDF4;   /* 20% tint - backgrounds */
--color-accent-500:  #DC804B;   /* Coral - arrows & interactive accents */
--color-neutral-900: #1F1F23;   /* High-contrast text */
--color-neutral-600: #646464;   /* Body copy, secondary icons */
--color-neutral-100: #F8F9FA;   /* Card / surface background */

/* Dark Mode (12% lightness inversion, accent unchanged) */
--color-primary-600: #5A9BD4;   /* +12% lightness */
--color-primary-100: #2B3B4D;   /* Inverted +12% */
--color-accent-500:  #DC804B;   /* Unchanged */
--color-neutral-900: #F0F0F0;   /* Inverted +12% */
--color-neutral-600: #A8A8A8;   /* +12% lightness */
--color-neutral-100: #252529;   /* Inverted +12% */
```

### Typography
**Primary Font:** Inter (Google Fonts)
**Monospace Font:** Roboto Mono (Google Fonts)

```css
/* Typography Scale */
H1: 32px / 40px, weight 700
H2: 24px / 32px, weight 600
H3: 20px / 28px, weight 600
Body: 16px / 24px, weight 400
Mono: 14px / 24px, weight 500
```

### Spacing (4pt Scale)
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
```

### Border Radius
```css
--radius-card: 8px    /* Cards, containers */
--radius-pill: 4px    /* Buttons, pills */
```

### Shadows
```css
--shadow-elevation-1: 0 2px 4px rgba(0, 0, 0, 0.05)
```

### Motion
```css
--duration-fast: 200ms
--duration-slow: 400ms
--easing-advance: cubic-bezier(0.4, 0, 0.2, 1)
```

## Tailwind Classes

### Colors
- `text-primary` - Primary brand color (#174E7A)
- `text-accent` - Accent coral color (#DC804B)
- `text-secondary` - Secondary gray (#646464)
- `bg-surface` - White surface background
- `bg-muted` - Neutral light background
- `bg-primary-100` - Light primary tint
- `bg-accent-500` - Accent background

**Background Strategy:**
- **Light-first approach**: Use light backgrounds with subtle differentiation
- **No dark backgrounds**: Avoid `bg-neutral-900`, `bg-gray-900`, `bg-black` for surfaces
- **Specialty backgrounds**: Code blocks, tooltips, and overlays use light variants with borders/shadows

### Typography
- `text-heading-1` - H1 styles (32px/40px, 700)
- `text-heading-2` - H2 styles (24px/32px, 600)
- `text-body` - Body text (16px/24px, 400)
- `text-mono` - Monospace numeric text
- `font-sans` - Inter font family
- `font-mono` - Roboto Mono font family

### Components
- `card` - Standard card styling with shadow
- `pill` - Pill-shaped border radius
- `btn-primary` - Primary button styling
- `btn-accent` - Accent button styling
- `shadow-elevation-1` - Standard card shadow

### Motion
- `transition-advance` - Standard transition with brand easing
- `transition-slow` - Slower transition (400ms)

## Brand Assets

### Logo Files (Located in `/public/brand/`)
```
01_logo_horizontal.png          # Main logo, transparent
02_logo_horizontal_tagline.png  # Marketing/landing
03_logo_stacked.png             # Vertical contexts
04_logo_stacked_tagline.png     # Stacked with tagline
05_icon_arrow.png               # Small icon / loader
06_icon_circle.png              # App icon
07_logo_horizontal_white.png    # Dark backgrounds
08_logo_monochrome_blue.png     # Single color version
09_monogram_AW.png              # Initials only
10_favicon32.png                # Browser tab
```

### Logo Usage Guidelines

#### 1. Logo Selection
- **Horizontal space ≥ 130px:** Use `01_logo_horizontal.png`
- **Narrow/vertical contexts:** Use `03_logo_stacked.png`
- **Marketing surfaces only:** Use tagline versions (`02`, `04`)
- **Dark backgrounds:** Use `07_logo_horizontal_white.png`
- **Width < 80px:** Replace with `06_icon_circle.png`

#### 2. Clear Space
- Minimum clear space: ½ arrow height on all sides
- Minimum logo width: 80px

#### 3. Usage in Code
```tsx
import { Logo } from '../components/Logo'

// Standard horizontal logo
<Logo variant="horizontal" width={160} />

// With tagline (marketing only)
<Logo variant="horizontal" showTagline width={180} />

// Stacked for narrow spaces
<Logo variant="stacked" width={100} />

// Icon only for small spaces
<Logo variant="icon" width={32} />

// Dark background
<Logo variant="horizontal" dark width={160} />
```

## Implementation Files

### Core Files
- `tailwind.config.js` - Design token configuration
- `app/globals.css` - CSS variables and component styles
- `components/Logo.tsx` - Logo component with brand guidelines
- `app/layout.tsx` - Updated with brand metadata and fonts

### Updated Components
- Main page header with AdvanceWeekly branding
- Navigation tabs with accent colors
- Button styles using design tokens
- Typography hierarchy throughout

## Development Notes

### CSS Variables
All design tokens are available as CSS variables and Tailwind classes. Prefer Tailwind classes in components for consistency.

### Color Usage
- **Primary (Deep Blue):** Headlines, brand elements, primary CTAs
- **Accent (Coral):** Interactive elements, selected states, arrows
- **Neutral:** Body text, secondary UI, backgrounds

### Motion Guidelines
- Use `transition-advance` for standard interactions
- Progress indicators animate 0 → value with ease-out
- Completed states use subtle scale or opacity pulses

### Accessibility
- Minimum contrast ratios maintained
- Focus states use accent color
- Logo alt text includes tagline when shown
- Clear space requirements ensure readability

## Brand Voice
- Professional yet approachable
- Focus on clarity and insight
- Emphasize the value of stepping back from busy work
- Position as a tool for thoughtful reflection and growth