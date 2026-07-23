import { cleanup, render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QtyStepper from '../QtyStepper.svelte';

afterEach(cleanup);

describe('QtyStepper', () => {
  it('renders the initial numeric value', () => {
    render(QtyStepper, { props: { value: 5 } });
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('increments when the plus button is clicked', async () => {
    const onChange = vi.fn();
    render(QtyStepper, { props: { value: 5, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByDisplayValue('6')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('decrements when the minus button is clicked', async () => {
    const onChange = vi.fn();
    render(QtyStepper, { props: { value: 5, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(screen.getByDisplayValue('4')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('clamps to the configured minimum', async () => {
    render(QtyStepper, { props: { value: 0, min: 0 } });
    await fireEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(screen.getByDisplayValue('0')).toBeTruthy();
  });

  it('clamps to the configured maximum', async () => {
    const onChange = vi.fn();
    render(QtyStepper, { props: { value: 9, max: 10, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByDisplayValue('10')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByDisplayValue('10')).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rounds typed values to the nearest step', async () => {
    render(QtyStepper, { props: { value: 3, step: 5 } });
    const input = screen.getByDisplayValue('3');
    await fireEvent.input(input, { target: { value: '12' } });
    expect(screen.getByDisplayValue('10')).toBeTruthy();
  });

  it('rejects non-numeric input and falls back to the minimum', async () => {
    render(QtyStepper, { props: { value: 5 } });
    const input = screen.getByDisplayValue('5');
    await fireEvent.input(input, { target: { value: 'abc' } });
    expect(screen.getByDisplayValue('0')).toBeTruthy();
  });

  it('clamps on blur if the value drifts out of range', async () => {
    render(QtyStepper, { props: { value: 0, min: 0, max: 20 } });
    const input = screen.getByDisplayValue('0');
    await fireEvent.input(input, { target: { value: '25' } });
    await fireEvent.blur(input);
    expect(screen.getByDisplayValue('20')).toBeTruthy();
  });

  it('disables both buttons and the input when disabled is true', async () => {
    render(QtyStepper, { props: { value: 5, disabled: true } });
    expect((screen.getByRole('button', { name: 'Tambah' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole('button', { name: 'Kurangi' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByDisplayValue('5') as HTMLInputElement).disabled).toBe(true);
  });
});
