# Sphere Connect Design System

## Overview
This document outlines the design guidelines, color palette, typography, and UI components used in the Sphere Connect application.

---

## Color Palette

### Primary Colors
- **Primary Green**: `#86A185`
  - Used for: Sidebar background, primary buttons, active states
  - Theme color representing the brand

- **Accent Yellow/Lime**: `#CECB2A`
  - Used for: Timeline dots, navigation controls, accent elements
  - Provides visual contrast and highlights

### Secondary Colors
- **Blue Primary**: `#4E73DF`
  - Used for: Links, primary actions

- **Red Alert**: `#DB2A1B`
  - Used for: Tooltips, error states, urgent notifications

- **Deep Blue**: `#0046D5`
  - Used for: Call-to-action buttons, important links

### Neutral Colors
- **White**: `#FFFFFF` / `#FFF`
  - Background for cards, content areas

- **Light Gray**: `#F8F9FA`, `#F5F7F8`, `#F8F9FC`
  - Background for inactive states, subtle sections

- **Medium Gray**: `#858796`
  - Body text color, borders

- **Black**: `#000000`
  - Headings, important text

### Bootstrap Extended Colors
- **Indigo**: `#6610F2`
- **Purple**: `#6F42C1`
- **Pink**: `#E83E8C`
- **Red**: `#E74A3B`
- **Orange**: `#FD7E14`
- **Yellow**: `#F6C23E`
- **Teal**: `#20C9A6`
- **Cyan**: `#36B9CC`
- **Success Green**: `#1CC88A`
- **Info Cyan**: `#36B9CC`
- **Warning Yellow**: `#F6C23E`
- **Danger Red**: `#E74A3B`

---

## Typography

### Font Families

#### Primary Font - Nunito
```css
font-family: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```
- **Usage**: Body text, general UI elements
- **Weights**: 400 (normal), 700 (bold)

#### Secondary Font - Nexa
```css
font-family: 'nexa'
font-weight: 600
```
- **Usage**: Headings, special emphasis (`.arial` class)

#### Tertiary Font - Source Sans Pro
```css
font-family: 'Source Sans Pro', sans-serif
```
- **Usage**: Alternative for body text (`.helvetica` class)

#### Monospace Font
```css
font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
```
- **Usage**: Code blocks, technical content

### Font Sizes

#### Headings
- **H1 / .heading1**: `2.5rem` (40px)
- **H2 / .heading2**: `2rem` (32px)
- **H3 / .heading3**: `1.75rem` (28px)
- **H4 / .heading4**: `1.5rem` (24px)
- **H5 / .heading5**: `1.25rem` (20px)
- **H6 / .heading6**: `1rem` (16px)

#### Display Text
- **Display 1**: `6rem`
- **Display 2**: `5.5rem`
- **Display 3**: `4.5rem`
- **Display 4**: `3.5rem`

#### Body Text
- **Base**: `1rem` (16px)
- **Small**: `0.9375rem` (15px)
- **Tiny**: `12px` (`.smallfnt`)
- **Lead**: `1.25rem`

#### Special Elements
- **Dashboard heading**: `30px` (`.dash_head`)
- **Timeline content**: `24px` for h3
- **Timeline paragraph**: `14px` with `line-height: 22px`

### Font Weights
- **Normal**: 400
- **Bold**: 700
- **Semi-bold**: 600 (Nexa font)

---

## Layout & Spacing

### Container Padding
- **Standard padding**: `90px 0` (`.pad`)
- **Responsive padding** (mobile/tablet): `40px 0`
- **Dashboard background**: `25px 50px` (desktop), `0px 10px` (responsive)

### Responsive Breakpoints
```css
--breakpoint-xs: 0
--breakpoint-sm: 576px
--breakpoint-md: 768px
--breakpoint-lg: 992px
--breakpoint-xl: 1200px
```

### Border Radius
- **Small**: `3px` (cards, tooltips)
- **Medium**: `5px` (dashboard background)
- **Large**: `12px` (dashed cards)
- **Circular**: `50%` (icons, buttons)
- **Button**: `40px` (pill-shaped buttons)

---

## UI Components

### Cards

#### Dashed Subject Card
```css
border: 2px dashed #000000
box-shadow: 2px 4px 6px rgba(0, 0, 0, 0.08)
border-radius: 12px
background: #FFFFFF
```

#### Timeline Cards
- **Content Card 1**: White background, relative positioning, `225px` height
- **Content Card 2**: White background, `61px` margin-top
- **Arrow/Triangle**: Created with CSS borders for connecting elements

### Buttons

#### Primary Button (Notification/404)
```css
background: #0046D5
color: #fff
padding: 15px 30px
border-radius: 40px
font-size: 14px
font-weight: 700
box-shadow: 0px 4px 15px -5px #0046D5
```

### Navigation

#### Sidebar
```css
background-color: #86A185
color: white
```
- Dark sidebar with primary green background
- White logo (GHWHITE.png)
- Text-based navigation items

#### Nav Pills (Tabs)
```css
background-color: #f8f9fa
border-bottom: 2px solid #86a185 (active state)
color: #000 (active)
border-radius: 0
margin: 0 2rem 0 0
```

### Icons & Indicators

#### Round Circle Icon Container
```css
background-color: #fff
width: 50px
height: 50px
line-height: 50px
border-radius: 50px
text-align: center
```

#### Timeline Icon
```css
width: 25px
height: 25px
border-radius: 50%
background: #cecb2a (for danger/active state)
```

### Timeline Elements

#### Dots Line
```css
width: 100%
height: 5px / 5.6px
background: #cecb2a
position: relative
```

#### Carousel Navigation (Owl Carousel)
```css
width: 57px
height: 57px
font-size: 55px
color: #ffffff
background-color: #cecb2a
border-radius: 50%
```

### Tooltips
```css
background: #db2a1b
border-radius: 3px
padding: 15px
font-size: 20px
width: 320px
height: 100px
```

---

## Effects & Animations

### Blink Animation
```css
@keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 1; }
}
animation: blink 1s infinite
```

### Box Shadows
- **Card shadow**: `1px 3px 9px rgba(0,0,0, 0.1)`
- **Dashed card shadow**: `2px 4px 6px rgba(0, 0, 0, 0.08)`
- **Button shadow**: `0px 4px 15px -5px #0046d5`

### Hover States
- **Link hover**: Color changes to `#224ABE` (darker blue)
- **Tooltip**: Opacity transitions, translateY animation
- **Cursor**: `cursor: pointer` for interactive elements

---

## Branding Assets

### Logo Files
- **Primary Logo**: `digified_logo.png` (Gold/tan color - `#C9A961` approximate)
- **White Logo**: `GHWHITE.png` (Used on dark sidebar)
- **Company Logo**: Dynamic based on session (`logo{company_id}.png`)
- **Fallback Logo**: `include/images/logo.png`

### Logo Specifications
- **Sidebar Logo Width**: `70px`
- **Vertical Margin**: `30px`
- **Logo Color**: Gold/tan (#C9A961 approximate from the D logo)

---

## Form Elements

### Input Fields
```css
font-family: inherit
font-size: inherit
line-height: inherit
margin: 0
```

### Labels
```css
display: inline-block
margin-bottom: 0.5rem
```

### Placeholders
- Standard placeholder styling inherits from input styles

---

## Tables

### Table Styling
```css
border-collapse: collapse
caption-side: bottom
color: #858796 (caption text)
padding: 0.75rem (caption)
```

---

## Utility Classes

### Width
- `.w-15`: `15%`
- `.w0`: `0%`

### Display & Position
- `.fixed`: `position: fixed; z-index: 2`
- `.cursor`: `cursor: pointer`
- `.fullpad`: `padding: 0; margin: 0`

### Text
- `.wrdbrk`: `white-space: pre`
- `.smallfnt`: `font-size: 12px`

### Spacing
- `.mb60`: `margin-bottom: 60px`
- `.point`, `.point1`, `.point2`: Various positioning utilities

---

## Design Principles

1. **Consistency**: Use the primary green (#86A185) as the main brand color throughout
2. **Contrast**: Yellow/lime accent (#CECB2A) provides visual interest against green
3. **Accessibility**: Maintain readable text colors with sufficient contrast
4. **Whitespace**: Use padding and margins generously for breathing room
5. **Responsiveness**: Adapt layouts for mobile (< 768px), tablet (768-992px), and desktop (> 992px)
6. **Icons**: Bootstrap Icons library is primary icon set
7. **Shadows**: Subtle shadows for depth (avoid heavy shadows)

---

## Additional Notes

### Third-Party Libraries
- **Bootstrap 4.6.0**: Base framework
- **Bootstrap Icons 1.10.5**: Icon library
- **SB Admin 2**: Admin template foundation
- **jQuery UI**: Enhanced UI interactions
- **Font Awesome**: Supplementary icons

### File Structure
- **CSS**: `/css/` directory
  - `style.css`: Custom styles
  - `sb-admin-2.css`: Bootstrap admin template
  - `jquery-ui.css`: jQuery UI styling
- **Images**: `/img/` directory
- **JavaScript**: `/js/` directory

---

## Usage Guidelines

1. Always use the primary green (#86A185) for main navigation and primary actions
2. Reserve the accent yellow (#CECB2A) for highlights, active states, and visual emphasis
3. Maintain consistent spacing using the defined padding/margin values
4. Use Nunito as the primary font family
5. Follow the responsive breakpoints for mobile-first design
6. Apply dashed card style for important content containers
7. Use the round circle icon container pattern for dashboard metrics
8. Implement the timeline component pattern for process flows

---

*Last Updated: April 2026*
*Application: Sphere Connect*
*Version: 1.0*