import { cleanup, render, fireEvent, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Sheet from '../Sheet.svelte';

afterEach(cleanup);

// The fixed inset-0 backdrop is the parent of the transition wrapper which
// contains the [role="dialog"] panel: backdrop > wrapper > dialog.
function backdropOf(container: HTMLElement): HTMLElement {
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  return dialog!.parentElement!.parentElement as HTMLElement;
}

describe('Sheet', () => {
  it('does not render anything when closed', () => {
    render(Sheet, { props: { open: false, title: 'Test', onClose: vi.fn() } });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on backdrop click when not persistent', async () => {
    const onClose = vi.fn();
    const { container } = render(Sheet, { props: { open: true, title: 'Test', onClose } });
    const backdrop = backdropOf(container);
    // Regression: the backdrop must never have pointer-events:none — that made
    // clicks pass through to the page behind the modal.
    expect(backdrop.style.pointerEvents).not.toBe('none');
    await fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open on backdrop click when persistent and blocks the page behind', async () => {
    const onClose = vi.fn();
    const { container } = render(Sheet, {
      props: { open: true, persistent: true, title: 'Test', onClose },
    });
    const backdrop = backdropOf(container);
    // Regression: `persistent` used to set pointer-events:none on the backdrop,
    // so clicks passed through to the page behind the modal. The backdrop must
    // capture clicks (blocking the background) but not close the sheet.
    expect(backdrop.style.pointerEvents).not.toBe('none');
    await fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('still closes via the X button when persistent', async () => {
    const onClose = vi.fn();
    render(Sheet, { props: { open: true, persistent: true, title: 'Test', onClose } });
    await fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
