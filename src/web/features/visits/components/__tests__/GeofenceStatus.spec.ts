import { cleanup, render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeofenceStatus from '../GeofenceStatus.svelte';

const baseProps = {
  distanceM: null as number | null,
  radiusM: 100,
  accuracy: null as number | null,
  gpsReady: false,
  gpsError: null as string | null,
  canOverride: false,
  override: false,
  overrideReason: '',
};

describe('GeofenceStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'input-uuid' });
  });

  afterEach(cleanup);

  it('shows the GPS waiting state when gpsReady is false', () => {
    render(GeofenceStatus, { props: baseProps });
    expect(screen.getByText('Menghubungkan sinyal GPS presensi…')).toBeTruthy();
    expect(screen.getByText('Status Presensi GPS')).toBeTruthy();
  });

  it('shows a GPS error when provided', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: false, gpsError: 'Permission denied' },
    });
    expect(screen.getByRole('alert').textContent).toBe('⚠️ GPS Error: Permission denied');
  });

  it('shows the inside-radius status when distance is within radius', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: 50 },
    });
    expect(screen.getByText('Valid')).toBeTruthy();
    expect(screen.getByText('50 m')).toBeTruthy();
    expect(screen.getByText('Radius max: 100 m')).toBeTruthy();
  });

  it('shows the outside-radius status and omits override when not allowed', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: 150, canOverride: false },
    });
    expect(screen.getByText('Luar Radius')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows an override checkbox when outside radius and override is allowed', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: 150, canOverride: true },
    });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByPlaceholderText('Contoh: pemilik kirim foto via WA')).toBeNull();
  });

  it('reveals the reason input when override is checked', async () => {
    render(GeofenceStatus, {
      props: {
        ...baseProps,
        gpsReady: true,
        distanceM: 150,
        canOverride: true,
        override: true,
        overrideReason: 'urgent visit',
      },
    });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    const reasonInput = screen.getByPlaceholderText('Contoh: pemilik kirim foto via WA');
    expect(reasonInput).toBeTruthy();
    expect((reasonInput as HTMLInputElement).value).toBe('urgent visit');
  });

  it('toggles the reason input when the checkbox is clicked', async () => {
    render(GeofenceStatus, {
      props: {
        ...baseProps,
        gpsReady: true,
        distanceM: 150,
        canOverride: true,
      },
    });
    const checkbox = screen.getByRole('checkbox');
    expect(screen.queryByPlaceholderText('Contoh: pemilik kirim foto via WA')).toBeNull();
    await fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('Contoh: pemilik kirim foto via WA')).toBeTruthy();
  });

  it('displays GPS accuracy when provided', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: 50, accuracy: 12.7 },
    });
    expect(screen.getByText('±13 m')).toBeTruthy();
  });

  it('formats radius as kilometres when >= 1000 m', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: 50, radiusM: 1500 },
    });
    expect(screen.getByText('Radius max: 1,5 km')).toBeTruthy();
  });

  it('shows a dash when distance is unknown', () => {
    render(GeofenceStatus, {
      props: { ...baseProps, gpsReady: true, distanceM: null },
    });
    const row = screen.getByText('Jarak ke Warung').parentElement;
    expect(row?.textContent).toContain('-');
  });
});
