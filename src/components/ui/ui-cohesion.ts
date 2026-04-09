/**
 * Shared visual primitives for cohesive light-mode UI.
 * Elevation tiers: 1 = resting, 2 = hover/raised, 3 = dropdown/popover, 4 = modal/dialog
 */
export const UI_RADIUS = "rounded-lg";
export const UI_SURFACE_SHADOW = "shadow-[var(--elevation-1)]";
export const UI_FLOATING_SHADOW = "shadow-[var(--elevation-3)]";
export const UI_MODAL_SHADOW = "shadow-[var(--elevation-4)]";
export const UI_PANEL_PADDING = "p-6";
export const UI_PANEL_SPACING = "gap-4";

export const UI_TEXT_PRIMARY = "text-foreground";
export const UI_TEXT_SECONDARY = "text-muted-foreground";

export const UI_MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[6px]";
export const UI_MODAL_PANEL_CLASS =
  "w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-4)]";

/** Spring-like ease-out curve (approximates spring with damping ~0.8) */
export const UI_MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Framer Motion spring config for modals/dialogs */
export const UI_SPRING_MODAL = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };

/** Framer Motion spring config for cards/subtle interactions */
export const UI_SPRING_CARD = { type: "spring" as const, stiffness: 300, damping: 26, mass: 0.6 };

/** Framer Motion spring config for page transitions */
export const UI_SPRING_PAGE = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };
