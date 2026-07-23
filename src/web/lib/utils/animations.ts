import { fade, fly, type TransitionConfig } from 'svelte/transition';
import { cubicOut, cubicIn } from 'svelte/easing';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function routeIn(
  node: Element,
  params: { delay?: number; duration?: number } = {}
): TransitionConfig | undefined {
  if (prefersReducedMotion()) return undefined;
  return fly(node, {
    x: 12,
    opacity: 0,
    delay: params.delay ?? 0,
    duration: params.duration ?? 200,
    easing: cubicOut,
  });
}

export function routeOut(
  node: Element,
  params: { duration?: number } = {}
): TransitionConfig | undefined {
  if (prefersReducedMotion()) return undefined;
  return fade(node, {
    duration: params.duration ?? 150,
    easing: cubicIn,
  });
}

/**
 * Convenience Svelte transition props object for route-level wrapping:
 *
 * ```svelte
 * <div in:routeIn out:routeOut>
 *   <slot />
 * </div>
 * ```
 */
export const routeTransition = {
  in: routeIn,
  out: routeOut,
};
