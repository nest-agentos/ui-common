# ui-common

Independent native DOM UI foundation. Runtime dependencies must remain empty; do not import NestOS, VFS, sessions, routing, window managers or application i18n/icons.

- Keep layout and responsive rules here; hosts inject labels, trusted icon markup, state and callbacks.
- Preserve original controls, focus, disabled state and listeners when moving between toolbar and More.
- Navigation controls have at least 44px touch targets. MOBILE_NAVIGATION_QUERY and CSS use the same 768px boundary.
- Publish JavaScript, declarations and navigation.css together. Do not access browser globals at import time.
- Keep functions small and lifecycle cleanup idempotent. Do not log user text or control values.

Validation: pnpm typecheck, pnpm test, pnpm build.

- Dialog content markup is trusted host code; all titles, labels and Toast content use textContent. Locale and labels are supplied by the caller. Importing the package never touches DOM globals. Components ship their own components.css without application styles.

ContentTitleBarParts.modeToggle adopts an existing mode control from editors with distinct view/edit modes. Preserve that node and restore it on unmount. Rename capability does not imply document editing: editable titles alone show no edit-mode icon. Dirty state remains an independent indicator.

Absolute timestamps use shared time-format helpers: wire values are UTC instants, presentation follows the browser local IANA zone with its actual offset. Calendar dates and durations retain their semantics; no mutable host time-zone configuration. Local datetime inputs convert once at the boundary and reject ambiguous or missing DST wall times.
