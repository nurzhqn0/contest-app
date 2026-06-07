# Design Specification: PublicHomePage iPhone Video Redesign

**Date**: 2026-06-07  
**Status**: Approved

## 1. Goal & Context
The public landing page ([PublicHomePage.tsx](file:///Users/myrzanizimbetov/Desktop/game-app/frontend/src/pages/PublicHomePage.tsx)) serves as the main entrance for contest spectators and students. To match a premium SaaS aesthetic, the page must:
1. Enforce a **clean, minimalistic editorial design** with **no curves** (sharp geometric corners) globally.
2. Provide a **Telegram bot demo video walkthrough** hosted inside a high-fidelity CSS/HTML **iPhone Pro frame mockup** on the right side of the split-hero.
3. Keep the **Access Room Leaderboard** card on the left side, center-aligned and simplified.

---

## 2. Proposed UI Changes

### Left Column: Value Proposition & Leaderboard Access
- **Typography**: Editorial Newsreader serif for headers (`font-display`) and clean Outfit sans for descriptions.
- **Access Form**: A clean white card with a subtle border and shadow, featuring:
  - "Spectator Mode" indicator label.
  - Room Code input with a monospace font, centered text, uppercase transformation, and letter-spacing tracking.
  - "Open Leaderboard" button with sharp corners.

### Right Column: iPhone Video Player Frame
- **iPhone 15/16 Pro CSS Frame**:
  - Outer border bezel with subtle gray finish and a slim border-radius for the phone casing itself (40px standard for phone bezel, but screen inner container is 30px).
  - Dynamic Island pill centered at the top of the screen.
  - iOS status bar overlay at the top (displaying time `9:41`, battery, and signal icons) on top of the video layer.
  - iOS home indicator bar overlay at the bottom.
- **Video Element**:
  - Standard HTML5 `<video>` element nested inside the phone screen, configured with `controls`, `autoplay`, `loop`, and `muted`.
  - The video source is pointed to a local video asset folder: `src/assets/onboarding-demo.mp4` (with fallback to an illustrative styled placeholder if the file is not yet uploaded).

---

## 3. Styling Rules (Sharp Corners)
- All interactive controls (`Button`, `TextField.Root`, `Badge`, `Card`) will inherit `radius="none"` from the global `<Theme>` configuration in [main.tsx](file:///Users/myrzanizimbetov/Desktop/game-app/frontend/src/main.tsx).
- Tailwind utility classes like `rounded-md`, `rounded-lg`, and `rounded-xl` will evaluate to `0px` via the customized `borderRadius` theme overrides in [tailwind.config.js](file:///Users/myrzanizimbetov/Desktop/game-app/frontend/tailwind.config.js).

---

## 4. Verification Plan
- **Production Build**: Run `npm run build` inside `frontend/` to check for compilation and type check errors.
- **Visual Validation**: Launch the dev server and test responsive behavior on mobile/tablet views.
