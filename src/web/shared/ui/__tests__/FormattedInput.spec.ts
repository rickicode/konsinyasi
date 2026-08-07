import { cleanup, render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import FormattedInputHarness from './__fixtures__/FormattedInputHarness.svelte';

afterEach(cleanup);

describe('FormattedInput', () => {
  it('mounts without throwing when the bound value is undefined', () => {
    // Regression: Svelte 5 throws `props_invalid_value` ("Cannot do bind:value={undefined}
    // when `value` has a fallback value") when a parent binds an undefined variable to a
    // prop that has a fallback ($bindable(0)). FormattedInput must accept undefined.
    expect(() => render(FormattedInputHarness, { props: { initial: undefined } })).not.toThrow();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('formats typed amounts with thousand separators and writes back to the bound state', async () => {
    render(FormattedInputHarness, { props: { initial: undefined } });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: '5000' } });
    expect(input.value).toBe('5.000');
    expect(screen.getByTestId('bound-value').textContent).toBe('5000');
  });

  it('shows the raw value while editing and the formatted value on blur', async () => {
    render(FormattedInputHarness, { props: { initial: 12000 } });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('12.000');
    await fireEvent.focus(input);
    expect(input.value).toBe('12000');
    await fireEvent.blur(input);
    expect(input.value).toBe('12.000');
  });

  it('displays the placeholder when bound value is undefined', () => {
    render(FormattedInputHarness, { props: { initial: undefined } });
    expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe('0');
  });
});
