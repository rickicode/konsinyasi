/**
 * Tiny wrapper around `navigator.vibrate` with device/permission guards.
 *
 * The Vibration API is not available on iOS/Safari or inside some WebViews.
 * It also does not expose a permission prompt, but we still guard against
 * invalid patterns, reduced-motion preference, and non-secure contexts.
 */

export type HapticPattern = number | number[];

/**
 * Returns true when the device reports vibration support and the current
 * environment is not explicitly requesting reduced motion.
 */
export function canVibrate(): boolean {
	if (typeof navigator === 'undefined') return false;
	if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return false;
	if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return false;
	}
	return true;
}

/**
 * Trigger a haptic pattern. Returns `true` when vibration was actually invoked.
 *
 * @param pattern -milliseconds to vibrate, or an array of on/off intervals.
 */
export function haptic(pattern: HapticPattern = 15): boolean {
	if (!canVibrate()) return false;

	let normalized: number | number[] = pattern;
	if (typeof normalized === 'number') {
		if (!Number.isFinite(normalized) || normalized <= 0) return false;
	} else if (Array.isArray(normalized)) {
		if (normalized.length === 0) return false;
		// Clamp negative values to 0; the API would throw otherwise.
		normalized = normalized.map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
	} else {
		return false;
	}

	try {
		return navigator.vibrate(normalized);
	} catch {
		return false;
	}
}

/**
 * Stop any active vibration pattern.
 */
export function stopHaptics(): boolean {
	if (!canVibrate()) return false;
	try {
		return navigator.vibrate(0);
	} catch {
		return false;
	}
}

/** Subtle tap for buttons and toggles. */
export function hapticImpact(): boolean {
	return haptic(15);
}

/** Two-pulse success pattern. */
export function hapticSuccess(): boolean {
	return haptic([15, 50, 30]);
}

/** Three-pulse warning pattern. */
export function hapticWarning(): boolean {
	return haptic([20, 40, 20, 40, 20]);
}

/** Longer single buzz for errors / destructive confirmations. */
export function hapticError(): boolean {
	return haptic(50);
}

/**
 * Pick a contextual haptic preset by intent.
 */
export function hapticByIntent(intent: 'impact' | 'success' | 'warning' | 'error'): boolean {
	switch (intent) {
		case 'success':
			return hapticSuccess();
		case 'warning':
			return hapticWarning();
		case 'error':
			return hapticError();
		case 'impact':
		default:
			return hapticImpact();
	}
}
