# UI Spec: Draft Night — Sports Broadcast (V1)

**Project**: Draft Stonk
**Variant**: Draft Night — Sports Broadcast
**Date**: 2026-05-06
**Stack**: Next.js 16 App Router · React 19 · Hono API · shadcn/ui · Tailwind CSS
**Status**: Implementation-Ready

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Global Layout & Navigation](#2-global-layout--navigation)
3. [Landing Page (`/`)](#3-landing-page-)
4. [OAuth Modal (Overlay on Landing)](#4-oauth-modal-overlay-on-landing)
5. [Dashboard / Home (`/home`)](#5-dashboard--home-home)
6. [Quick Draft Setup (2-Step)](#6-quick-draft-setup-2-step)
7. [Live Draft Screen (`/draft/[leagueType]/[leagueId]`)](#7-live-draft-screen-draftleaguetypeleagueid)
8. [Standings Page (`/league/[leagueId]/standings`)](#8-standings-page-leagueleagueidstandings)
9. [Leaderboard (`/leaderboard`)](#9-leaderboard-leaderboard)
10. [Interaction States (Global)](#10-interaction-states-global)
11. [Accessibility (Global)](#11-accessibility-global)
12. [New Components Inventory](#12-new-components-inventory)

---

## 1. Design System

### 1.1 Color Tokens

| Token | Tailwind Class | Hex | Usage |
|---|---|---|---|
| bg-base | `slate-900` | `#0f172a` | Page backgrounds |
| bg-card | `slate-800` | `#1e293b` | Cards, panels |
| bg-elevated | `slate-700` | `#334155` | Table headers, input bg |
| bg-overlay | `black/60` | `rgba(0,0,0,0.6)` | Modal backdrop |
| primary | `emerald-500` | `#10b981` | CTAs, active states, live badges |
| primary-hover | `emerald-600` | `#059669` | CTA hover |
| primary-muted | `emerald-500/10` | `rgba(16,185,129,0.1)` | Selected card tint |
| accent | `amber-400` | `#fbbf24` | Highlights, WAITING badges, timer warning |
| accent-dark | `amber-600` | `#d97706` | Bronze rank |
| text-primary | `white` | `#ffffff` | Headings, primary content |
| text-secondary | `slate-300` | `#cbd5e1` | Body text |
| text-tertiary | `slate-400` | `#94a3b8` | Labels, helper text |
| text-muted | `slate-500` | `#64748b` | Placeholders, disabled, footnotes |
| border-default | `slate-700` | `#334155` | Card borders, table dividers |
| border-active | `emerald-500` | `#10b981` | Selected/active element borders |
| gain | `emerald-400` | `#34d399` | Positive returns |
| loss | `red-400` | `#f87171` | Negative returns |
| rank-gold | `amber-400` | `#fbbf24` | Rank 1 |
| rank-silver | `slate-300` | `#cbd5e1` | Rank 2 |
| rank-bronze | `amber-600` | `#d97706` | Rank 3 |

### 1.2 Typography Scale

| Role | Classes | Usage |
|---|---|---|
| Hero | `text-5xl md:text-7xl font-black uppercase tracking-tight` | Landing hero headline |
| Page title | `text-3xl font-bold text-white` | Section headings |
| Section heading | `text-xl font-bold text-white` | Card headings, subsections |
| Broadcast label | `text-xs uppercase tracking-widest text-emerald-500` | "ON THE CLOCK", live indicators |
| Body | `text-base text-slate-300` | General body copy |
| Small | `text-sm text-slate-400` | Details, labels, meta |
| Micro | `text-xs text-slate-500` | Footnotes, tertiary |
| Timer | `text-4xl font-mono font-bold text-white` | Countdown display |
| Badge | `text-xs font-bold px-2 py-0.5 rounded-full` | Status badges |
| Mono label | `font-mono text-xs` | Round/pick indicators (R1.P1) |

### 1.3 Spacing & Sizing

| Token | Value | Usage |
|---|---|---|
| Card padding | `p-6` (24px) | Standard card interior |
| Card padding-sm | `p-4` (16px) | Compact list items, table rows |
| Card radius | `rounded-xl` | Cards, modals |
| Section gap | `gap-6` (24px) | Between major sections |
| Grid gap | `gap-4` (16px) | Between cards in a grid |
| Min touch target | `min-h-[44px] min-w-[44px]` | All interactive elements |
| Nav height | `h-16` (64px) | Top navigation bar |
| Footer bar height | `h-16` (64px) | Draft footer confirm bar |

### 1.4 Animation & Transitions

| Effect | Definition |
|---|---|
| Card hover | `transition-colors duration-150` |
| Button press | `active:scale-95 transition-transform duration-75` |
| Card press | `active:scale-[0.98] transition-transform duration-75` |
| Live badge pulse | `animate-pulse` on bg dot or entire badge |
| Ticker scroll | `@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }` at 30s linear infinite |
| Timer danger pulse | `animate-pulse` when < 5s remaining |
| Modal entry | `animate-in slide-in-from-bottom-4 duration-200` (shadcn Dialog) |
| Focus ring | `ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900` |

### 1.5 Responsive Breakpoints

| Breakpoint | Tailwind prefix | Viewport |
|---|---|---|
| Mobile | (default) | ≤ 640px |
| Tablet | `sm:` | 641px – 1024px |
| Desktop | `lg:` | > 1024px |

---

## 2. Global Layout & Navigation

### 2.1 Authenticated Navigation Bar

**Applies to**: `/home`, `/quick-draft/**`, `/league/**`, `/leaderboard`
**Does NOT apply to**: `/draft/**` (full-viewport immersive, no nav)
**Height**: `h-16` (64px)
**Background**: `bg-slate-900 border-b border-slate-800`
**Position**: `sticky top-0 z-40`

**Layout (flex, items-center, justify-between, px-4 lg:px-8):**

- **Left**: Logo — `text-xl font-black uppercase text-white` displaying "DRAFT STONK". Wraps in `<a href="/home">` with `hover:text-emerald-400 transition-colors`.
- **Center (hidden on mobile, flex on lg)**: Nav links — `flex gap-8`
  - "Home" → `/home`
  - "Leaderboard" → `/leaderboard`
  - Each link: `text-sm font-medium text-slate-300 hover:text-white transition-colors`
  - Active link (current route): `text-white` with `border-b-2 border-emerald-500 pb-0.5`
- **Right**: Profile dropdown trigger — `flex items-center gap-2`
  - Avatar circle: `w-8 h-8 rounded-full bg-slate-700 overflow-hidden` (shows user image or initials in `text-sm font-bold text-white`)
  - Chevron-down icon: `w-4 h-4 text-slate-400`
  - Full element: `flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-h-[44px]`
  - Dropdown (shadcn DropdownMenu): `bg-slate-800 border-slate-700 rounded-xl min-w-[160px]`
    - "Profile" item: `text-slate-300 hover:text-white hover:bg-slate-700 px-4 py-2 text-sm`
    - "Settings" item: same styling
    - Divider: `border-slate-700`
    - "Sign Out" item: `text-red-400 hover:text-red-300 hover:bg-slate-700 px-4 py-2 text-sm`

**Mobile nav (lg:hidden):**

- Show only Logo (left) and Profile avatar (right). No center nav links.
- Bottom of page: **Mobile tab bar** — `fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-slate-900 border-t border-slate-800 h-16 px-2`
  - Tabs: Home (house icon + "Home" label), Leaderboard (trophy icon + "Leaderboard" label)
  - Each tab: `flex flex-col items-center gap-0.5 text-[10px] min-w-[64px] min-h-[44px] justify-center`
  - Inactive: `text-slate-500` icon + text
  - Active: `text-emerald-500` icon + text
  - Icons: 20×20px Lucide icons (`Home`, `Trophy`)

### 2.2 Page Container

All authenticated pages (excluding draft): `min-h-screen bg-slate-900`
Content wrapper: `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
Mobile bottom padding: `pb-24` to clear mobile tab bar

---

## 3. Landing Page (`/`)

### 3.1 Structure

Full-bleed `min-h-screen bg-slate-900 flex flex-col overflow-hidden`

```
┌────────────────────────────────────────────┐
│  TickerMarquee (full-width strip)           │
├────────────────────────────────────────────┤
│                                            │
│              Hero Section                  │
│          (flex-1, centered)                │
│                                            │
├────────────────────────────────────────────┤
│  Footer (minimal links)                    │
└────────────────────────────────────────────┘
```

### 3.2 TickerMarquee Strip

**Position**: Top of page, above hero
**Height**: `h-10` (40px)
**Background**: `bg-slate-800 border-b border-slate-700`
**Overflow**: `overflow-hidden`

**Inner track**: Two identical lists of items concatenated side-by-side (so loop is seamless) inside a `flex` container. The container applies `animation: marquee 30s linear infinite`.

**Each ticker item** (spacing `px-6`):
- Ticker symbol: `font-mono font-bold text-white text-sm`
- Space char
- Price: `font-mono text-sm` — `text-emerald-400` if positive change, `text-red-400` if negative
- Change delta: `text-xs ml-1` same color — e.g. `+2.4%` or `-1.1%`
- Separator: `text-slate-600 mx-4` — `·`

**Sample items (hardcoded for V1, replace with real data later)**:
`AAPL $189.43 +1.2%` · `MSFT $378.92 +0.8%` · `GOOGL $175.44 -0.3%` · `TSLA $248.11 +3.7%` · `AMZN $198.22 +0.5%` · `NVDA $875.43 +2.1%` · `META $492.81 -0.6%` · `BRK.B $380.00 +0.2%` · `JPM $198.34 +1.0%` · `V $276.55 +0.4%`

**Loading state**: Replace items with shimmer bars — `8` items of `w-24 h-4 rounded bg-slate-700 animate-pulse`

**CSS (add to global stylesheet or Tailwind config)**:
```css
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 30s linear infinite;
}
```

**Mobile**: Same marquee, `text-xs` for ticker items.

### 3.3 Hero Section

**Container**: `flex-1 flex flex-col items-center justify-center text-center px-4 py-16`

**Layout (stacked, gap-6)**:

1. **Eyebrow badge** (optional): `inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm text-emerald-400 font-medium` — text: "Season 1 Now Live · Join 12,847 drafters"

2. **Headline**:
   ```
   <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
     DRAFT NIGHT<br/>
     <span className="text-emerald-500">IS LIVE</span>
   </h1>
   ```

3. **Subheadline**: `text-lg md:text-xl text-slate-300 max-w-md mx-auto mt-2` — "Pick your stocks. Beat your friends. No money required."

4. **CTA Button**: `mt-8 inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all duration-150 min-h-[56px] min-w-[220px]` — label: "Enter the Draft Room"
   On click: open OAuth modal (see Section 4). If already authenticated: `router.push('/home')`.
   **Mobile**: `w-full max-w-xs`

5. **Social proof**: `text-sm text-slate-400 mt-4` — "12,847 stocks drafted this week"

**Authenticated state**: If user session exists on page load, replace CTA with `router.replace('/home')` redirect (no flash — use loading skeleton if session check in-flight).

### 3.4 Footer

`mt-auto py-6 flex items-center justify-center gap-6 text-sm text-slate-500`

Links: "About", "Terms", "Privacy" — each `hover:text-slate-300 transition-colors`

---

## 4. OAuth Modal (Overlay on Landing)

**Trigger**: "Enter the Draft Room" CTA on landing
**Component**: shadcn `Dialog` — `open={isOpen} onOpenChange={setIsOpen}`
**Accessibility**: `role="dialog"` `aria-labelledby="auth-modal-title"` `aria-modal="true"`

### 4.1 Backdrop

`bg-black/60 backdrop-blur-sm` (shadcn DialogOverlay class override)
On click outside: close modal (`onOpenChange(false)`)
Escape key: close modal

### 4.2 Modal Container

`bg-slate-800 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl`
Entry animation: `animate-in slide-in-from-bottom-4 duration-200`

### 4.3 Modal Content (stacked, gap-6)

1. **Header row** (`flex items-start justify-between`):
   - Left: `<h2 id="auth-modal-title" className="text-xl font-bold text-white">Sign in to draft</h2>`
   - Right: Close button — `w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors` with `×` or Lucide `X` icon (16px). `aria-label="Close sign-in modal"`

2. **Button stack** (`flex flex-col gap-3 mt-2`):

   **"Continue with Google"**:
   ```
   className="flex items-center justify-center gap-3 w-full h-12
              border border-slate-500 rounded-lg text-white font-medium
              hover:bg-slate-700 active:scale-95 transition-all duration-150"
   ```
   - Google SVG icon (18×18, inline, standard Google colors)
   - Label: "Continue with Google"
   - `onClick`: `signIn('google')`

   **"Continue with GitHub"**:
   ```
   className="flex items-center justify-center gap-3 w-full h-12
              border border-slate-500 rounded-lg text-white font-medium
              hover:bg-slate-700 active:scale-95 transition-all duration-150"
   ```
   - GitHub SVG icon (18×18, inline, `fill-white`)
   - Label: "Continue with GitHub"
   - `onClick`: `signIn('github')`

3. **Helper text**: `text-sm text-slate-400 text-center mt-1` — "No account needed — we'll create one"

---

## 5. Dashboard / Home (`/home`)

### 5.1 Page Structure

```
bg-slate-900 min-h-screen
│
├── V1DashboardHeader (sticky nav, see §2.1)
│
└── Main content (max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8)
    │
    ├── Welcome Block
    ├── Draft Cards Grid (includes "New Draft" card)
    └── Empty State (conditional)
```

### 5.2 Welcome Block

`mb-8`

- Line 1: `text-2xl font-bold text-white` — "Welcome back, [firstName]"
  `[firstName]` from session user name, first word only.
- Line 2: `text-slate-400 text-base mt-1` — "Ready for another draft?"

### 5.3 Draft Cards Grid

**Grid**: `grid grid-cols-1 lg:grid-cols-2 gap-4`

**"New Draft" card** (always first in grid):

```
className="bg-slate-800 border-2 border-emerald-500 rounded-xl p-6
           flex flex-col items-center justify-center gap-3
           min-h-[160px] cursor-pointer
           hover:bg-emerald-500/5 active:scale-[0.98]
           transition-all duration-150"
href="/quick-draft/setup"
```

- `+` icon: Lucide `Plus` — `w-8 h-8 text-emerald-500`
- Label: `text-lg font-semibold text-emerald-400` — "Start a New Draft"

### 5.4 GameCard Component

**Container**:
```
className="relative bg-slate-800 rounded-xl p-6
           flex flex-col gap-4 cursor-pointer
           hover:border hover:border-emerald-500/50
           active:scale-[0.98] transition-all duration-150
           border border-slate-700"
```

**Status badge** (absolute top-right: `absolute top-4 right-4`):

| Status | Classes |
|---|---|
| LIVE | `bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse` |
| COMPLETED | `bg-slate-600 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full` |
| WAITING | `bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full` |

**Card body (stacked)**:

1. **League name**: `text-xl font-bold text-white pr-20` (right padding to avoid badge overlap)

2. **Details row**: `text-sm text-slate-400` — "[N] rounds · [N] drafters"

3. **Stats row** (`flex items-center gap-4 mt-1`):
   - Return %: `text-base font-bold` — `text-emerald-400` if positive (prefix `+`), `text-red-400` if negative
   - Rank badge: `inline-flex items-center bg-slate-700 rounded-full px-2.5 py-0.5 text-xs font-medium text-slate-300` — "Rank [N]"

**Click behavior**:
- `status === 'live'` → `router.push('/draft/[type]/[id]')`
- `status === 'completed'` → `router.push('/league/[id]/standings')`
- `status === 'waiting'` → `router.push('/draft/[type]/[id]')` (lobby view)

### 5.5 Empty State

Shown when user has zero drafts. Replaces the card grid (keep "New Draft" card at top).

```
className="flex flex-col items-center justify-center text-center
           py-20 gap-4"
```

- Illustration placeholder: `w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center` with Lucide `Trophy` icon `w-10 h-10 text-slate-600`
- Heading: `text-xl font-bold text-white` — "Your first draft awaits"
- Body: `text-sm text-slate-400 max-w-xs` — "Invite your friends, pick your stocks, and may the best portfolio win."
- CTA: Same emerald button style — "Start a Draft" → `/quick-draft/setup`

### 5.6 Mobile-Only: Sticky "New Draft" Button

`fixed bottom-16 left-0 right-0 z-40` (above tab bar at `bottom-0`)
`bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-base py-4 text-center w-full`
Label: "+ New Draft"
Hidden on `lg:` (`lg:hidden`)
On click: `router.push('/quick-draft/setup')`

---

## 6. Quick Draft Setup (2-Step)

### 6.1 Routes

- Step 1: `/quick-draft/setup` (or `/quick-draft/setup?step=1`)
- Step 2: `/quick-draft/setup?step=2`

### 6.2 Page Shell

`min-h-screen bg-slate-900 flex flex-col`

**Top bar** (`h-16 flex items-center justify-between px-4`):
- Left: Back arrow button — `w-10 h-10 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors` with Lucide `ArrowLeft` icon (20px). On Step 1: `router.push('/home')`. On Step 2: go back to Step 1.
- Center: Step dots indicator
  - Step 1 active: `●  ○` — `flex gap-2`; active dot `w-2 h-2 rounded-full bg-emerald-500`, inactive dot `w-2 h-2 rounded-full bg-slate-600`
  - Step 2 active: `○  ●`
- Right: Close `X` button — same style as back arrow, `router.push('/home')`. `aria-label="Exit setup"`

**Content area**: `flex-1 max-w-2xl mx-auto w-full px-4 py-8`

### 6.3 Step 1: "Choose Your Arena"

**Heading**: `text-3xl font-bold text-white mb-2` — "Choose Your Arena"
**Subtext**: `text-slate-400 text-base mb-8` — "Pick a stock category to draft from"

**Preset cards grid**: `grid grid-cols-1 sm:grid-cols-2 gap-4`

**PresetCard component**:

```
className="relative bg-slate-800 rounded-xl p-6 cursor-pointer
           border-2 transition-all duration-150 active:scale-[0.98]"
```

States:
- Default: `border-transparent hover:border-emerald-500/50`
- Selected: `border-emerald-500 bg-emerald-500/10`

**Card internal layout (flex flex-col gap-2)**:

1. **Icon area**: `w-10 h-10 rounded-lg flex items-center justify-center mb-1`
   Background: per-category color (see table below)
   Icon: Lucide icon (20px, white)

2. **Name**: `text-lg font-bold text-white`

3. **Stock count**: `text-sm text-slate-400`

4. **Sample tickers**: `text-xs text-slate-500 font-mono`

5. **Selected checkmark** (conditional): `absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center` with Lucide `Check` icon (12px white)

**Preset category definitions**:

| Category | Icon (Lucide) | Icon bg | Name | Stock count | Sample tickers |
|---|---|---|---|---|---|
| tech | `Cpu` | `bg-blue-500/20` | Tech Giants | 20 stocks | AAPL, MSFT, GOOGL... |
| sp500 | `TrendingUp` | `bg-purple-500/20` | S&P Leaders | 30 stocks | JNJ, JPM, V... |
| volatile | `Zap` | `bg-red-500/20` | Volatile Picks | 15 stocks | GME, AMC, BBBY... |
| custom | `Settings` | `bg-slate-600/40` | Custom | varies | Your choice |

"Custom" card behavior: Shows same selected border, but on Step 2 expands a stock multi-select section instead of showing preselected tickers. (Out of scope for V1 initial implementation — show as `opacity-60` with `cursor-not-allowed` and a `"Coming Soon"` micro-badge `absolute top-2 right-2 text-[10px] bg-slate-700 text-slate-400 rounded-full px-2 py-0.5`.)

**"Next" button** (at bottom of Step 1 content):
```
className="w-full mt-8 h-14 bg-emerald-500 hover:bg-emerald-600
           active:scale-95 text-white font-bold text-lg rounded-lg
           transition-all duration-150 disabled:opacity-50
           disabled:cursor-not-allowed"
disabled={selectedCategory === null}
onClick={() => router.push('/quick-draft/setup?step=2')}
```
Label: "Next →"

### 6.4 Step 2: "Confirm & Draft"

**Heading**: `text-3xl font-bold text-white mb-2` — "Confirm & Draft"
**Subtext**: `text-slate-400 text-base mb-8` — "Review your draft settings"

**Summary card**:
```
className="bg-slate-800 rounded-xl p-6 flex flex-col gap-4
           border border-slate-700"
```

Summary rows (`flex items-center justify-between py-3 border-b border-slate-700 last:border-0`):

| Label | Value |
|---|---|
| Category | `[selectedCategoryName]` (white font-semibold) |
| Stocks in pool | `[N] stocks` |
| Rounds | `3` (default) |
| Drafters | `4` (default) |

**"Customize" toggle**:
`button className="text-sm text-emerald-400 hover:text-emerald-300 underline"` — "Customize settings"
On click: toggles expanded advanced section below the summary card.

**Advanced options section** (collapsed by default, `transition-all`):

```
className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mt-2 flex flex-col gap-6"
```

- **Rounds slider**: Label `text-sm font-medium text-slate-300 mb-2` — "Rounds: [N]"
  Slider: `<input type="range" min={2} max={8} step={1}>` styled `accent-emerald-500 w-full h-2`
  Value display: `text-white font-bold text-base inline-block w-6 text-center`

- **Drafter count**: Label `text-sm font-medium text-slate-300 mb-2` — "Drafters: [N]"
  Selector: row of increment/decrement buttons `−` and `+` (`w-10 h-10 rounded-md bg-slate-700 text-white hover:bg-slate-600 font-bold text-lg`) with count value `text-white font-bold text-xl w-8 text-center` between them.
  Min: 2, Max: 8.

**Start Draft CTA**:
```
className="w-full mt-8 h-14 bg-emerald-500 hover:bg-emerald-600
           active:scale-95 text-white font-bold text-lg rounded-lg
           transition-all duration-150"
onClick={handleStartDraft}  // creates league + redirects to /draft/quick/[id]
```
Label: "Start Draft"

**Loading state on click**: Replace label with `<Loader2 className="w-5 h-5 animate-spin" />` + " Setting up..."

---

## 7. Live Draft Screen (`/draft/[leagueType]/[leagueId]`)

### 7.1 Page Shell

`min-h-screen bg-slate-900 flex flex-col overflow-hidden`
**No navigation bar** — full-viewport immersive.
`pt-0` — top bar is part of the draft shell.

**Responsive stacking**:
- Desktop `lg:`: horizontal panels (left draft order feed + right stock picker)
- Mobile: vertical stack (timer → stock picker full-width → collapsed pick bar → footer)

### 7.2 Draft States

The screen has four states: `start | drafting | selection | done`

---

### 7.3 State: `start` (Pre-Draft Lobby)

**Full viewport centered content** (`flex-1 flex flex-col items-center justify-center gap-8 px-4`):

1. **"DRAFT NIGHT" hero text**:
   ```
   <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-center">
     <span className="text-white">DRAFT</span><br/>
     <span className="text-emerald-500">NIGHT</span>
   </h1>
   ```

2. **League name**: `text-lg font-medium text-slate-400 tracking-wide` — "[League Name]"

3. **Participant list** (`flex flex-wrap gap-2 justify-center mt-2`):
   Each participant pill: `flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2`
   - Avatar: `w-6 h-6 rounded-full bg-slate-700 text-xs font-bold text-white flex items-center justify-center` (initials)
   - Name: `text-sm text-slate-300`
   - Commissioner: append `(you)` in `text-emerald-400` if current user is commissioner

4. **"Start Draft" CTA** (commissioner only; others see "Waiting for commissioner..."):
   Commissioner:
   ```
   className="mt-4 px-12 py-4 bg-emerald-500 hover:bg-emerald-600
              active:scale-95 text-white font-bold text-xl rounded-lg
              transition-all duration-150"
   ```
   Label: "Start Draft"

   Non-commissioner:
   ```
   className="mt-4 flex items-center gap-2 text-slate-400 text-base"
   ```
   `<Loader2 className="w-4 h-4 animate-spin" />` "Waiting for draft to start..."

---

### 7.4 Top Bar (visible during `drafting` and `selection` states)

`h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10`

- **Left**: League name — `text-sm uppercase tracking-wide text-slate-400 truncate max-w-[140px]`
- **Center**: Round/pick indicator — `text-sm text-slate-300 font-mono` — "Round [X] · Pick [Y]"
- **Right**: Close `X` button — `w-10 h-10 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors` — `aria-label="Exit draft"`. On click: confirm dialog ("Are you sure? Your progress will be saved.") then `router.push('/home')`.

---

### 7.5 Timer Block (your turn only, above panels)

`flex flex-col items-center py-4 border-b border-slate-800`

1. **"ON THE CLOCK" label**: `text-xs uppercase tracking-widest text-emerald-500 animate-pulse mb-1`

2. **Countdown display** (CountdownTimer component, restyled):

   | Remaining | Classes |
   |---|---|
   | > 10s | `text-4xl font-mono font-bold text-white` |
   | 6s – 10s | `text-4xl font-mono font-bold text-amber-400` |
   | ≤ 5s | `text-4xl font-mono font-bold text-red-500 animate-pulse` |

   Format: `0:SS` (e.g. "0:30", "0:09")
   `aria-live="polite"` `aria-label="Time remaining: [N] seconds"`

**When it is NOT your turn**: Timer block hidden. Instead show nothing (or optionally a subtle `text-sm text-slate-500` label "Waiting on [Name]..." centered under the top bar — no pulse, no prominence).

---

### 7.6 Main Content Area (during `drafting` / `selection`)

Desktop: `flex flex-1 overflow-hidden`
Mobile: `flex flex-col flex-1`

#### 7.6.1 Draft Order Feed (left panel)

**Desktop**: `w-80 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden`
**Mobile**: Collapsed — replaced by **MiniPickBar** (see §7.6.3). Hidden via `hidden lg:flex`.

**Panel header**: `px-4 py-3 border-b border-slate-700 text-xs uppercase tracking-widest text-slate-400 font-medium`
Label: "Draft Order"

**Scrollable list**: `flex-1 overflow-y-auto`
Each pick slot row:

```
className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/50
           min-h-[44px] transition-colors"
```

States:
- **Default (not yet picked)**: bg: `bg-slate-800`
- **Current pick** (active turn): `bg-emerald-500 text-white` — all text white
- **Your pick** (user's own slot, not current): `ring-inset ring-1 ring-emerald-300/40 bg-slate-800`
- **Completed pick** (already made): `bg-slate-800 opacity-70`

Row content:
- **Round.Pick label**: `text-xs font-mono text-slate-500 w-12` — "R1.P1". On active row: `text-emerald-100`.
- **Drafter name**: `text-sm text-slate-300 flex-1 truncate`. On active row: `text-white font-medium`.
- **Picked ticker**: `text-sm font-bold text-right font-mono`. Emerald-400 if picked by you, white if picked by others, `text-slate-500 font-normal` if "—" (not yet picked). On active row: `text-white`.

---

#### 7.6.2 Stock Picker (right panel)

**Container**: `flex-1 flex flex-col overflow-hidden bg-slate-900`

**Search input** (`px-4 pt-4 pb-2`):
```
<input
  type="search"
  placeholder="Search stocks..."
  className="w-full h-11 bg-slate-700 text-white placeholder:text-slate-500
             rounded-lg px-4 text-sm border border-slate-600
             focus:outline-none focus:ring-2 focus:ring-emerald-500
             focus:border-transparent"
  aria-label="Search stocks"
/>
```

**Scrollable stock list** (`flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2 mt-2`):

Each stock button:
```
<button
  className="flex items-center justify-between w-full px-4 py-3
             rounded-lg border transition-all duration-100
             min-h-[52px] text-left"
>
```

States:
| State | Classes |
|---|---|
| Default | `bg-slate-800 border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5` |
| Selected | `bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500 ring-inset` |
| Disabled (already drafted) | `opacity-40 cursor-not-allowed bg-slate-800 border-slate-700` — add `title="Already drafted"` |
| Not your turn | `opacity-50 cursor-not-allowed` on entire list (apply to parent container, not individual items) |

Button interior:
- **Left side** (`flex flex-col gap-0.5`):
  - Ticker: `text-base font-bold text-white font-mono`
  - Company name: `text-xs text-slate-400 truncate max-w-[200px]`
- **Right side** (`flex flex-col items-end gap-0.5`):
  - Price: `text-sm text-slate-300 font-mono`
  - Already-drafted badge (if applicable): `text-[10px] text-slate-500` — "Drafted"

**Empty search result state** (`flex-1 flex flex-col items-center justify-center gap-2 text-center py-12`):
- Lucide `Search` icon `w-8 h-8 text-slate-600`
- `text-sm text-slate-400` — "No stocks match "[query]""

---

#### 7.6.3 Mobile MiniPickBar (replaces left panel on mobile)

`flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700 overflow-x-auto lg:hidden`

Shows: current pick + next 2 picks as horizontal pills.

**Current pick pill**: `flex items-center gap-1.5 bg-emerald-500 rounded-full px-3 py-1.5 flex-shrink-0`
- `text-xs font-bold text-white` — "[Name]" + " — " + "[TICKER or '?']"

**Upcoming pick pills**: `flex items-center gap-1.5 bg-slate-700 rounded-full px-3 py-1.5 flex-shrink-0`
- `text-xs text-slate-300` — "[Name]"

---

### 7.7 Footer Bar (fixed bottom)

`fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center`

**State: your turn, stock selected**:
```
className="w-full h-full bg-emerald-600 flex items-center justify-center
           lg:justify-end lg:px-8 gap-3"
```
- Label: `text-white font-bold text-base` — "Confirm Pick:"
- Ticker chip: `bg-white/20 rounded-full px-3 py-1 text-white font-mono font-bold text-base` — "[TICKER]"
- Desktop: Button on right — `bg-white text-emerald-700 font-bold px-6 py-2 rounded-lg hover:bg-slate-100 active:scale-95 transition-all`; label "Lock It In"
- Mobile: Tapping anywhere on the bar confirms pick

**State: your turn, no stock selected**:
```
className="w-full h-full bg-slate-800 border-t border-slate-700
           flex items-center justify-center"
```
`text-slate-400 text-sm` — "Select a stock to continue"

**State: not your turn**:
```
className="w-full h-full bg-slate-800 border-t border-slate-700
           flex items-center justify-center gap-2"
```
`<Loader2 className="w-4 h-4 text-slate-500 animate-spin" />` + `text-slate-400 text-sm` — "Waiting on [Name]..."

**State: draft complete** (transitions into `done` state):
```
className="w-full h-full bg-emerald-500 flex items-center justify-center"
```
`<button className="font-bold text-white text-lg">` — "Draft Complete! View Standings"
On click: `router.push('/league/[id]/standings')`

---

### 7.8 State: `done` (Draft Complete Screen)

Full viewport overlay appears on top of draft panels (or replaces them):

```
className="absolute inset-0 bg-slate-900 flex flex-col items-center
           justify-center text-center px-4 gap-6 z-20"
```

1. **Headline**:
   ```
   <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white">
     DRAFT<br/>
     <span className="text-emerald-500">COMPLETE</span>
   </h1>
   ```

2. **Confetti-style visual**: 4–6 colored dot spans (`w-3 h-3 rounded-full`) in emerald/amber/white scattered via absolute positioning with varying `top/left` values and `animate-bounce` with staggered `animation-delay`. Contained within a `relative w-40 h-20` wrapper above the headline.

3. **Quick stats** (`flex gap-6 mt-2`):
   - "Your picks: [N]" — `text-sm text-slate-400`
   - "Total stocks drafted: [N]" — `text-sm text-slate-400`

4. **CTA stack** (`flex flex-col gap-3 w-full max-w-xs mt-4`):
   - Primary: `w-full h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-lg rounded-lg transition-all` — "View Standings"
     On click: `router.push('/league/[id]/standings')`
   - Secondary: `w-full h-12 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg font-medium transition-all` — "Back to Home"
     On click: `router.push('/home')`

---

## 8. Standings Page (`/league/[leagueId]/standings`)

### 8.1 Page Structure

```
bg-slate-900 min-h-screen
│
├── V1DashboardHeader (sticky nav)
│
└── max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8
    │
    ├── Page header block
    ├── Standings table (RankingsTable)
    ├── Share card (ShareCard)
    ├── CTA row
    └── Disclaimer
```

### 8.2 Page Header Block

`mb-8`

- Eyebrow: `text-sm uppercase tracking-widest text-slate-400 mb-1` — "[League Name]"
- Title: `text-3xl font-bold text-white uppercase tracking-wide` — "STANDINGS"

### 8.3 Standings Table

**Outer container**: `bg-slate-800 rounded-xl overflow-hidden border border-slate-700`

**Table header row**: `grid bg-slate-700 px-4 py-3`

Grid columns (CSS class or inline style):
- Desktop: `grid-cols-[2rem_1fr_5rem_7rem_7rem]`
- Mobile: `grid-cols-[2rem_1fr_5rem]` (hide Current/Baseline columns: `hidden sm:block`)

Header cell text: `text-xs uppercase tracking-wide text-slate-400 font-medium`
Headers: `#`, `Participant`, `Return`, `Current Value` (hidden on mobile), `Baseline` (hidden on mobile)

**Data rows**:

Each row is a `<div>` (or `<button>` to enable expansion) styled:
```
className="grid items-center px-4 py-3 border-b border-slate-700
           last:border-0 min-h-[52px] cursor-pointer
           hover:bg-slate-700/40 transition-colors"
```
Same grid-cols as header.

**Rank cell** (`text-sm font-bold`):
- Rank 1: `text-amber-400 font-black`
- Rank 2: `text-slate-300 font-bold`
- Rank 3: `text-amber-600 font-bold`
- Rank 4+: `text-slate-400`

**Participant cell** (`flex items-center gap-2`):
- Avatar: `w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden` (image or initials)
- Name: `text-sm font-medium text-white`
- "(you)" suffix if current user: `text-xs text-emerald-400 ml-1`

**Return cell** (`text-sm font-bold font-mono`):
- Positive: `text-emerald-400` — "+12.4%"
- Negative: `text-red-400` — "-3.1%"
- Zero: `text-slate-400` — "0.0%"

**Current Value cell** (`text-sm text-slate-300 font-mono hidden sm:block`)
Example: "$10,842"

**Baseline Value cell** (`text-sm text-slate-500 font-mono hidden sm:block`)
Example: "$9,650"

**Expandable per-pick breakdown**:

On row click: toggle expanded state. Below the row, insert:
```
className="col-span-full bg-slate-900/60 border-b border-slate-700"
```

Inner table (same overflow-hidden rounded style, smaller):
`px-4 py-3`

Sub-table header: `text-xs text-slate-500 uppercase tracking-wide grid grid-cols-[3rem_1fr_4rem_5rem]`
Columns: "Rd", "Stock", "Return", "Value"
Each sub-row: `grid grid-cols-[3rem_1fr_4rem_5rem] py-1.5 text-xs`
- Rd: `text-slate-500 font-mono`
- Ticker + Name: `text-white font-mono` + `text-slate-400 ml-1`
- Return: emerald-400 / red-400 per sign
- Value: `text-slate-300 font-mono`

Expand/collapse chevron icon on row right (Lucide `ChevronDown`/`ChevronUp`, 16px, `text-slate-500`): `ml-auto`

---

### 8.4 ShareCard Component

`bg-slate-800 rounded-xl p-6 border border-slate-700 mt-6`

**Header**: `text-lg font-bold text-white mb-4` — "Share Your Results"

**Pre-formatted text preview**:
```
className="bg-slate-700 rounded-lg p-3 text-sm text-slate-300
           font-mono leading-relaxed mb-4 whitespace-pre-wrap"
```
Content (generated dynamically):
```
🏆 Draft Stonk Season 1
[League Name] — Final Standings

1. [Name]  +12.4%  (+$1,192)
2. [Name]   +5.2%    (+$501)
3. [Name]   -1.1%    (-$106)
4. [Name]   -3.8%    (-$367)

My best pick: NVDA +31.2% 💎
draftstonk.com
```

**Button row** (`flex gap-3`):
- Copy button: `flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-medium rounded-lg transition-all text-sm`
  Icon: Lucide `Copy` (16px)
  Label: "Copy"
  On click: `navigator.clipboard.writeText(shareText)` → briefly change to `text-white` + `Check` icon for 1500ms ("Copied!")

- Twitter share button: `flex items-center gap-2 px-4 py-2.5 border border-slate-500 hover:border-slate-400 text-slate-300 hover:text-white font-medium rounded-lg transition-all text-sm`
  Icon: `X` (Twitter) SVG (16×16, `fill-current`)
  Label: "Share"
  `href`: `https://twitter.com/intent/tweet?text=[encodeURIComponent(shareText)]` in new tab

---

### 8.5 CTA Row

`flex gap-3 mt-6 flex-col sm:flex-row`

- **"Draft Again"**: `flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg transition-all` — on click: `router.push('/quick-draft/setup')`
- **"Back to Home"**: `flex-1 h-12 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg font-medium transition-all` — on click: `router.push('/home')`

### 8.6 Disclaimer

`text-xs text-slate-500 text-center mt-6 pb-4 max-w-prose mx-auto`

"Draft Stonk is a fantasy game. All stock prices are for entertainment purposes only. No real money is involved. Past performance in the game does not reflect real investment outcomes."

---

## 9. Leaderboard (`/leaderboard`)

### 9.1 Page Structure

```
bg-slate-900 min-h-screen
│
├── V1DashboardHeader
│
└── max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8
    │
    ├── Page header
    ├── Time filter tabs
    └── Leaderboard table
```

### 9.2 Page Header

`mb-6`

- Title: `text-3xl font-bold text-white uppercase tracking-wide` — "TOP DRAFTERS"
- Subtitle: `text-sm text-slate-400 mt-1` — "This Week" (updates to match active tab)

### 9.3 Time Filter Tabs

`flex gap-0 mb-6 border-b border-slate-700`

Tabs: "This Week", "This Month", "All Time"

Each tab:
```
className="px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]
           flex items-center -mb-px"
```
- Active: `text-white border-b-2 border-emerald-500`
- Inactive: `text-slate-400 hover:text-slate-300 border-b-2 border-transparent`

On tab change: update displayed data (mock or real). Active tab updates subtitle.

### 9.4 Leaderboard Table

**Outer container**: `bg-slate-800 rounded-xl overflow-hidden border border-slate-700`

**Table header row**: `grid bg-slate-700 px-4 py-3`
Grid columns: `grid-cols-[2rem_2.5rem_1fr_5rem_8rem]`
Headers (text-xs uppercase tracking-wide text-slate-400 font-medium): `#`, ` ` (avatar col), `Drafter`, `Win Rate`, `Best Pick`

**Data rows**:

```
className="grid items-center px-4 py-3 border-b border-slate-700
           last:border-0 min-h-[56px]"
```
Same grid-cols.

**Rank cell**:
- Rank 1: `text-amber-400 font-black text-base` — "1"
  (Optional: wrap in `relative` and add crown icon `absolute -top-1 -left-0.5` — Lucide `Crown` w-3 h-3 text-amber-400)
- Rank 2: `text-slate-300 font-bold`
- Rank 3: `text-amber-600 font-bold`
- Rank 4+: `text-slate-400 text-sm`

**Avatar cell**: `w-8 h-8 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-xs font-bold text-white`
Image if available, else initials.

**Drafter name cell**: `text-sm font-medium text-white`
On rows 1–3: additionally `font-bold`

**Win Rate cell** (`text-sm font-mono`):
- Rank 1: `text-amber-400 font-bold`
- Rank 2: `text-slate-300`
- Rank 3: `text-amber-600`
- Rest: `text-slate-300`
Format: "73.2%"

**Best Pick cell** (`text-sm font-mono`):
- Ticker: `text-emerald-400 font-bold` — e.g. "NVDA"
- Return: `text-slate-400 text-xs ml-1` — "+31.2%"
Both in `flex items-center gap-1`.

**Top 3 row accent** (rows 1–3): Left border highlight
```
className="border-l-2"
```
- Rank 1: `border-l-amber-400`
- Rank 2: `border-l-slate-300`
- Rank 3: `border-l-amber-600`

---

## 10. Interaction States (Global)

### 10.1 Button States

| State | Classes |
|---|---|
| Default | (defined per button) |
| Hover | `hover:bg-emerald-600` (primary), `hover:bg-slate-700` (secondary) — `transition-colors duration-150` |
| Active/pressed | `active:scale-95 transition-transform duration-75` |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none` |
| Loading | Replace label with `<Loader2 className="w-4 h-4 animate-spin" />` + optional loading text |
| Focus | `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:outline-none` |

### 10.2 Card States

| State | Classes |
|---|---|
| Default | `border border-slate-700` |
| Hover | `hover:border-emerald-500/50 transition-colors duration-150` |
| Active/selected | `border-emerald-500 bg-emerald-500/10` |
| Pressed | `active:scale-[0.98] transition-transform duration-75` |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` |

### 10.3 Stock List Item States

| State | Classes |
|---|---|
| Default | `bg-slate-800 border-slate-700` |
| Hover | `hover:border-emerald-500/50 hover:bg-emerald-500/5` |
| Selected | `border-emerald-500 ring-2 ring-emerald-500 ring-inset bg-emerald-500/10` |
| Already drafted | `opacity-40 cursor-not-allowed` |
| Not your turn (parent) | `pointer-events-none opacity-60` on list container |

### 10.4 Link States

| State | Classes |
|---|---|
| Default | `text-slate-300` |
| Hover | `hover:text-white hover:underline transition-colors` |
| Active route | `text-white` |
| Visited | (no special state — game context, not a doc site) |

### 10.5 Input States

| State | Classes |
|---|---|
| Default | `bg-slate-700 border-slate-600 text-white` |
| Focus | `focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none` |
| Invalid | `border-red-500 focus:ring-red-500` |
| Disabled | `opacity-50 cursor-not-allowed` |

---

## 11. Accessibility (Global)

### 11.1 Touch Targets

All interactive elements must meet `min-h-[44px] min-w-[44px]`.
Icon-only buttons must include `aria-label`.
Inline text links are exempt if adjacent label provides context.

### 11.2 Color Contrast

| Foreground | Background | Ratio | WCAG |
|---|---|---|---|
| `white` | `slate-900` | 15.4:1 | AAA |
| `slate-300` | `slate-900` | 7.5:1 | AAA |
| `slate-400` | `slate-900` | 4.6:1 | AA |
| `emerald-500` | `slate-900` | 4.5:1 | AA |
| `white` | `emerald-500` | 3.9:1 | AA (large/bold text only) |
| `slate-900` | `amber-400` | 10.1:1 | AAA |

### 11.3 Focus Management

- Tab order follows visual reading order (top-left to bottom-right).
- Modals: on open, focus moves to first focusable element. On close, focus returns to trigger.
- Draft screen: on stock selection, announce to screen reader via `aria-live="polite"`.
- Escape key: closes any open modal or dropdown.

### 11.4 ARIA

| Element | ARIA |
|---|---|
| OAuth modal | `role="dialog"` `aria-modal="true"` `aria-labelledby="auth-modal-title"` |
| Status badges | `aria-label="Status: [LIVE/COMPLETED/WAITING]"` |
| Draft countdown timer | `aria-live="polite"` `aria-label="Time remaining: [N] seconds"` |
| "ON THE CLOCK" label | `aria-live="assertive"` (announces when it's your turn) |
| Stock list | `role="listbox"` (or `role="list"`), each item `role="option"` |
| Selected stock | `aria-selected="true"` |
| Disabled stock | `aria-disabled="true"` |
| Standings table | semantic `<table>` with `<thead>` / `<tbody>` / `<th scope="col">` |
| Expand row button | `aria-expanded="true/false"` `aria-label="Expand picks for [Name]"` |
| Nav links | `aria-current="page"` on active link |
| Mobile tab bar | `role="navigation"` `aria-label="Main navigation"` |

### 11.5 Keyboard Navigation

| Key | Behavior |
|---|---|
| Tab | Navigate all interactive elements in order |
| Shift+Tab | Navigate backwards |
| Enter / Space | Activate button, toggle card selection |
| Escape | Close modal, close dropdown |
| Arrow keys | Navigate within DropdownMenu items (shadcn default) |
| Arrow keys | Navigate time filter tabs |

---

## 12. New Components Inventory

| Component | File location | Description |
|---|---|---|
| `TickerMarquee` | `features/landing/ticker-marquee.tsx` | Horizontal scrolling stock ticker strip. Props: `items: { ticker: string, price: string, change: number }[]`. Uses CSS `@keyframes marquee` with duplicate list for seamless loop. Shimmer loading state. |
| `OAuthModal` | `features/auth/oauth-modal.tsx` | shadcn Dialog wrapper. Props: `open: boolean, onOpenChange: (v: boolean) => void`. Renders Google + GitHub sign-in buttons via `signIn()` from next-auth. |
| `GameCard` | `features/dashboard/game-card.tsx` | Draft league card for dashboard grid. Props: `leagueId, leagueName, status: 'live' \| 'completed' \| 'waiting', rounds, drafterCount, returnPct, rank`. Handles its own click routing. |
| `PresetCard` | `features/draft/preset-card.tsx` | Category selector card for Quick Draft Step 1. Props: `id, name, stockCount, sampleTickers, icon, iconBgClass, selected, onSelect`. |
| `ShareCard` | `features/standings/share-card.tsx` | Share results card. Props: `leagueName, results: { name, returnPct, gain }[], bestPick: { ticker, returnPct }`. Generates share text. Handles clipboard copy + Twitter share. |
| `MiniPickBar` | `features/draft/mini-pick-bar.tsx` | Mobile horizontal pick status bar. Props: `picks: { drafter, ticker, isCurrent }[]`. Shows current + next 2 picks as pills. |
| `V1DashboardHeader` | `features/auth/v1-dashboard-header.tsx` | New nav replacing existing `DashboardHeader`. Slim top bar (Logo + 2 links + profile dropdown). Mobile: Logo + avatar only. Bottom tab bar rendered separately or as part of page layout. |

### Modified Components

| Current Component | New Component | Changes |
|---|---|---|
| `DraftScreen` | `V1DraftScreen` | Full-viewport layout, broadcast-style top bar, timer block, MiniPickBar on mobile, updated footer states. |
| `StandingsPage` | `V1StandingsPage` | New table grid layout, per-pick expansion, ShareCard integration. |
| `DashboardHeader` | (replaced by `V1DashboardHeader`) | Removed hamburger/Sheet sidebar. Slim 2-link nav. Profile dropdown instead of user button. |

---

*End of spec — Draft Night (V1)*
