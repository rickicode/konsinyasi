import { fade, fly, scale, slide, type TransitionConfig } from 'svelte/transition';
import { cubicOut, cubicIn, quintOut } from 'svelte/easing';

/**
 * Detects the user's motion preference. Always returns `true` during SSR or
 * when `window` is unavailable so that server/HTML snapshots stay static.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type RouteTransitionParams = {
  delay?: number;
  duration?: number;
};

/**
 * Svelte `in` transition for route-level content.
 * Respects `prefers-reduced-motion` and disables itself on reduced motion.
 */
export function routeIn(
  node: Element,
  params: RouteTransitionParams = {}
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

/**
 * Svelte `out` transition for route-level content.
 */
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
 * Convenience transition pair for wrapping routed pages:
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

export type CrossfadeParams = {
  duration?: number;
  easing?: (t: number) => number;
  delay?: number;
};

/**
 * Factory for a matched pair of `send`/`receive` crossfade transitions.
 * Useful for list reordering or moving an element between two containers.
 *
 * Usage:
 * ```svelte
 * const [send, receive] = crossfadeSlide();
 * <div in:receive={{ key }} out:send={{ key }}>
 * ```
 */
export function crossfadeSlide(params: CrossfadeParams = {}) {
  if (prefersReducedMotion()) {
    return [
      () => undefined as TransitionConfig | undefined,
      () => undefined as TransitionConfig | undefined,
    ];
  }

  const duration = params.duration ?? 250;

  function transition(node: Element, direction: 1 | -1): TransitionConfig | undefined {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;

    return {
      duration,
      delay: params.delay ?? 0,
      easing: params.easing ?? quintOut,
      css: (t: number, u: number) => {
        const offset = u * 16 * direction;
        return `
					transform: ${transform} translate3d(${offset}px, 0, 0);
					opacity: ${t};
				`;
      },
    };
  }

  return [(node: Element) => transition(node, 1), (node: Element) => transition(node, -1)];
}

/**
 * A gentler crossfade for items that mainly fade instead of sliding.
 */
export function crossfadeFade(params: CrossfadeParams = {}) {
  if (prefersReducedMotion()) {
    return [
      () => undefined as TransitionConfig | undefined,
      () => undefined as TransitionConfig | undefined,
    ];
  }

  const duration = params.duration ?? 200;

  return [
    (node: Element) =>
      fade(node, {
        duration,
        delay: params.delay ?? 0,
        easing: params.easing ?? cubicOut,
      }),
    (node: Element) =>
      fade(node, {
        duration,
        delay: params.delay ?? 0,
        easing: params.easing ?? cubicIn,
      }),
  ];
}

export type ListItemParams = {
  delay?: number;
  duration?: number;
  direction?: 1 | -1;
};

/**
 * Stagger-friendly `in` transition for list items.
 * Slides up a small distance while fading in.
 */
export function listItemIn(
  node: Element,
  params: ListItemParams = {}
): TransitionConfig | undefined {
  if (prefersReducedMotion()) return undefined;
  const direction = params.direction ?? 1;
  return fly(node, {
    y: 12 * direction,
    opacity: 0,
    delay: params.delay ?? 0,
    duration: params.duration ?? 200,
    easing: cubicOut,
  });
}

/**
 * `in` transition that scales an element up slightly while fading in.
 * Useful for dialogs, toasts, and buttons.
 */
export function scaleIn(
  node: Element,
  params: { delay?: number; duration?: number; start?: number } = {}
): TransitionConfig | undefined {
  if (prefersReducedMotion()) return undefined;
  return scale(node, {
    start: params.start ?? 0.96,
    opacity: 0,
    delay: params.delay ?? 0,
    duration: params.duration ?? 180,
    easing: cubicOut,
  });
}

/**
 * `in`/`out` slide transition with reduced-motion awareness.
 */
export function slideIn(
  node: Element,
  params: { delay?: number; duration?: number; axis?: 'x' | 'y' } = {}
): TransitionConfig | undefined {
  if (prefersReducedMotion()) return undefined;
  return slide(node, {
    delay: params.delay ?? 0,
    duration: params.duration ?? 200,
    axis: params.axis ?? 'y',
    easing: cubicOut,
  });
}

/**
 * Returns a no-op transition config. Useful as a fallback when motion is
 * programmatically disabled without rewriting component markup.
 */
export function instantTransition(): TransitionConfig {
  return { duration: 0 };
}

/**
 * CSS class helper: applies `motion-reduce:*` equivalent classes. The app shell
 * uses this to toggle reduced-motion aware styles on a root element.
 */
export function reducedMotionClass(): string {
  return prefersReducedMotion() ? 'reduced-motion' : '';
}
