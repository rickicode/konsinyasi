export function haptic(pattern: number | number[] = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export const hapticImpact = () => haptic(15);
export const hapticSuccess = () => haptic([15, 50, 30]);
export const hapticWarning = () => haptic([20, 40, 20, 40, 20]);
export const hapticError = () => haptic(50);
