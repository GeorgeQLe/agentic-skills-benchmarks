# Consolidated UI Specification: Dashboard

## Source Attribution

- Layout skeleton: Variation B (sidebar + main content)
- Color palette: Variation A (dark mode primary)
- Typography: Variation C (Inter + mono code blocks)

## Design Specification

### Layout Skeleton

- **Sidebar**: 240px fixed width, dark background (#1A1C1E), collapsible to 64px
- **Main content**: fluid, max-width 1200px, centered
- **Header**: 56px fixed height, surface background (#FAFAFA)
- **Content area**: scrollable, 24px padding

### Colors

- Primary: #2563EB (blue-600)
- On-primary: #FFFFFF
- Secondary: #4A6741 (green-700)
- Surface: #FAFAFA
- Background: #FFFFFF
- Error: #DC2626 (red-600)
- Warning: #F59E0B (amber-500)
- Success: #16A34A (green-600)
- Border: #E5E7EB (gray-200)
- Muted text: #6B7280 (gray-500)

### Typography

- Headings: Inter, weights 600-700
  - H1: 2.25rem / 700 / 1.2 line-height
  - H2: 1.5rem / 600 / 1.3 line-height
  - H3: 1.25rem / 600 / 1.4 line-height
- Body: Inter, 1rem / 400 / 1.5 line-height
- Small: Inter, 0.875rem / 400 / 1.4 line-height
- Code: JetBrains Mono, 0.875rem / 400 / 1.6 line-height

### Spacing Scale

- 4px base unit
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

### Border Radius

- sm: 4px (inputs, small badges)
- md: 8px (cards, buttons)
- lg: 12px (modals, panels)
- full: 9999px (avatars, pills)

### Elevation

- sm: 0 1px 2px rgba(0,0,0,0.05) — cards at rest
- md: 0 4px 6px rgba(0,0,0,0.07) — cards on hover
- lg: 0 10px 15px rgba(0,0,0,0.1) — modals, dropdowns

### Components

#### Button (Primary)
- Background: Primary (#2563EB)
- Text: On-primary (#FFFFFF)
- Padding: 8px 24px
- Border radius: md (8px)
- Font: Inter 0.875rem / 500
- Hover: darken 10%
- Disabled: opacity 0.5, cursor not-allowed

#### Card
- Background: Surface (#FAFAFA)
- Border: 1px solid Border (#E5E7EB)
- Border radius: lg (12px)
- Padding: 24px
- Shadow: sm elevation

#### Sidebar Nav Item
- Height: 40px
- Padding: 8px 16px
- Border radius: md (8px)
- Active: Primary background at 10% opacity, primary text
- Hover: gray-100 background
- Icon: 20px, 12px gap to label

### Responsive Behavior

- Desktop (>1024px): sidebar visible, full layout
- Tablet (641-1024px): sidebar collapsed to icons, main content expands
- Mobile (≤640px): sidebar hidden, hamburger menu, single column

### States

- Loading: skeleton placeholders matching content dimensions
- Empty: centered illustration + CTA button
- Error: inline error banner with red-600 left border
- Partial: content renders progressively, skeleton for pending sections

## Implementation Plan

1. Create design tokens file
2. Build sidebar component
3. Build header component
4. Build card component
5. Compose dashboard layout
6. Add responsive breakpoints
7. Add state variants
