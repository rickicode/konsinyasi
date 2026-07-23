import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AgeBadge from '../AgeBadge.svelte';

afterEach(cleanup);

describe('AgeBadge', () => {
  it('renders "baru" for ages under one hour with success styling', () => {
    render(AgeBadge, { props: { hours: 0 } });
    const badge = screen.getByText('baru');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('bg-success-bg');
    expect(badge.querySelector('svg')).toBeTruthy();
  });

  it('renders a rounded hour count below the warning threshold with success styling', () => {
    render(AgeBadge, { props: { hours: 24 } });
    const badge = screen.getByText('24 jam');
    expect(badge.className).toContain('bg-success-bg');
  });

  it('uses warning styling at the 72-hour threshold', () => {
    render(AgeBadge, { props: { hours: 72 } });
    const badge = screen.getByText('72 jam');
    expect(badge.className).toContain('bg-warning-bg');
  });

  it('uses danger styling at the 96-hour threshold', () => {
    render(AgeBadge, { props: { hours: 96 } });
    const badge = screen.getByText('96 jam');
    expect(badge.className).toContain('bg-danger-bg');
  });

  it('floors fractional hours when displaying the label', () => {
    render(AgeBadge, { props: { hours: 71.9 } });
    expect(screen.getByText('71 jam')).toBeTruthy();
  });

  it('forwards a custom class to the badge', () => {
    render(AgeBadge, { props: { hours: 1, class: 'my-class' } });
    const badge = screen.getByText('1 jam');
    expect(badge.className).toContain('my-class');
  });
});
