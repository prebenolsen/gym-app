# Copilot Instructions

This repository is a cross-platform gym app with shared domain logic and a React Native mobile client.

## This Is How We Do Things Here
- Reuse existing shared components and providers before creating new UI.
- Keep screen code focused on data flow and composition, not bespoke UI primitives.
- Always handle loading and error states explicitly.
- Always parse "," and "." to the same decimal separator so data is normalized before table usage.
- Source runtime colors from preferences/theme tokens, not hardcoded literals.

## Mobile Theme and Styling Rules
- Always read colors from `usePreferences()` and use `themeColors` tokens.
- Never use literal hex color values (for example `#fff`, `#000`) in screen files. Always use theme tokens from `themeColors`.
- Never define button shapes, padding, font weights, or border radius inline in screen `StyleSheet` blocks. Use `AppButton` variants and sizes instead.
- All styles must be created via `createStyles(themeColors)` to support light and dark mode.

## UI Component Usage Rules (mobile/src/components/ui)
- Never define local pressable CTA button styles in a screen or feature file. Always import and use `AppButton` from `mobile/src/components/ui/`.
- Never define local toast state, timers, and floating toast overlays in a screen or feature file. Always use `AppToastProvider` and `useToast` from `mobile/src/components/ui/`.
- Never define local selectable chip/toggle-pill button styling in a screen or feature file. Always import and use `ChipButton` from `mobile/src/components/ui/`.
- Never define local imperative confirm helper wrappers in a screen or feature file. Always use the confirm dialog helpers from `ConfirmDialog` in `mobile/src/components/ui/`.
- Never define local confirmation modal state machines for destructive/confirm actions in a screen or feature file. Always use `ConfirmDialogProvider` and `useConfirmDialog` from `mobile/src/components/ui/`.
- Never define local generic error modal primitives in a screen or feature file. Always import and use `ErrorDialog` from `mobile/src/components/ui/`.
- Never define local app-wide error modal context/state wiring in a screen or feature file. Always use `ErrorDialogProvider` and `useErrorDialog` from `mobile/src/components/ui/`.
- Never define local bottom-sheet modal shells in a screen or feature file. Always import and use `ModalSheet` from `mobile/src/components/ui/`.
- Never define local screen header bars (title/back/right-actions/subtitle) in a screen or feature file. Always import and use `ScreenHeader` from `mobile/src/components/ui/`.
- Never define local segmented tab switcher UI in a screen or feature file. Always import and use `SegmentedControl` from `mobile/src/components/ui/`.

## New Screen Rules
- Every new screen must use `ScreenHeader` for its header unless the header has genuinely unique behavior. In that case, leave a `// TODO: consider ScreenHeader extension` comment.
- Every new screen must source all colors from `themeColors` tokens only.
- No new UI primitives (buttons, chips, modals, toasts, dialogs) may be defined inside screen files.

## Extend UI Library First
- If a new screen requires a UI pattern not covered by an existing `mobile/src/components/ui/` component, create the reusable component in `mobile/src/components/ui/` first, then consume it in the screen.
- Prefer extending an existing component variant/prop API over duplicating similar UI with one-off styles.

## General Rules
- Always think user experience. 

## Text in the app: 
- The user is not here to read things, make the user experience intuitive and self-explanatory.
- Assume the user is an average person and knows what kilos and centimers are, don't add unecessary text to explain things that are common knowledge.