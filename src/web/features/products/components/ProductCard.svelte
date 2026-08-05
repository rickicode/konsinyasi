<script lang="ts">
  import { formatRupiah } from '$lib/utils/format.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import { fly } from 'svelte/transition';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { Product } from '@shared/schemas/product.schema.js';
  import type { IconName } from '../../../shared/ui/icons/Icon.svelte';

  type Props = {
    product: Product;
    ondetail?: () => void;
    onedit?: () => void;
    ondelete?: () => void;
  };

  let { product, ondetail, onedit, ondelete }: Props = $props();
  const auth = getAuth();

  let menuOpen = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);
  let isPressed = $state(false);

  const statusConfig: Record<Product['status'], { label: string; bg: string; dot: string }> = {
    active: {
      label: 'Aktif',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    inactive: {
      label: 'Nonaktif',
      bg: 'bg-coffee-50 text-coffee-500 border-coffee-200',
      dot: 'bg-coffee-400',
    },
  };

  type ActionItem = {
    label: string;
    icon: IconName;
    danger: boolean;
    fn?: () => void;
  };

  const actionItems: ActionItem[] = $derived([
    ...(ondetail
      ? [{ label: 'Detail', icon: 'eye' as IconName, danger: false, fn: ondetail }]
      : []),
    ...(auth.isOwner && onedit
      ? [{ label: 'Edit', icon: 'edit' as IconName, danger: false, fn: onedit }]
      : []),
    ...(auth.isOwner && ondelete
      ? [{ label: 'Hapus', icon: 'trash-2' as IconName, danger: true, fn: ondelete }]
      : []),
  ]);

  function handleAction(fn?: () => void) {
    menuOpen = false;
    fn?.();
  }

  function closeMenu() {
    menuOpen = false;
  }

  function handleCardClick() {
    ondetail?.();
  }

  function handlePointerDown() {
    isPressed = true;
  }

  function handlePointerUp() {
    isPressed = false;
  }

  function handlePointerLeave() {
    isPressed = false;
  }

  $effect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuEl && !menuEl.contains(target) && triggerEl && !triggerEl.contains(target)) {
        closeMenu();
      }
    }
    window.addEventListener('click', onClick, { capture: true });
    return () => window.removeEventListener('click', onClick, { capture: true });
  });
</script>

<article
  class="group relative flex flex-col overflow-hidden rounded-2xl border border-coffee-100 bg-cream shadow-sm transition-all duration-200 {isPressed
    ? 'scale-[0.98] shadow-xs'
    : 'hover:shadow-md hover:border-coffee-200'}"
  role="button"
  tabindex="0"
  onclick={handleCardClick}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerLeave}
  onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
>
  <!-- Image Area -->
  <div
    class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-coffee-50 to-coffee-100/50"
  >
    {#if product.photo_key}
      <img
        src={product.photo_url ?? ""}
        alt={product.name}
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
    {:else}
      <div class="flex h-full w-full items-center justify-center">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-coffee-100/80 text-coffee-300 transition-colors group-hover:bg-coffee-200/80 group-hover:text-coffee-400"
        >
          <Icon name="package" size={24} />
        </div>
      </div>
    {/if}

    <!-- Status Badge -->
    <span
      class="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold {statusConfig[
        product.status
      ].bg}"
    >
      <span class="h-1.5 w-1.5 rounded-full {statusConfig[product.status].dot}" aria-hidden="true"
      ></span>
      {statusConfig[product.status].label}
    </span>

    {#if product.is_public}
      <span class="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
        Publik
      </span>
    {/if}

    <!-- Action Menu Button -->
    {#if actionItems.length > 0}
      <div class="absolute right-2 top-2 z-10">
        <button
          bind:this={triggerEl}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Aksi produk"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/80 text-coffee-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-coffee-900 hover:shadow-md active:scale-95"
          onclick={(e) => {
            e.stopPropagation();
            menuOpen = !menuOpen;
          }}
        >
          <Icon name="more-vertical" size={16} />
        </button>

        {#if menuOpen}
          <div
            bind:this={menuEl}
            role="menu"
            class="absolute right-0 top-10 w-40 overflow-hidden rounded-xl border border-coffee-100 bg-white shadow-lg"
            transition:fly={{ y: -4, duration: 150 }}
          >
            {#each actionItems as item (item.label)}
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors {item.danger
                  ? 'text-danger hover:bg-danger-bg'
                  : 'text-coffee-700 hover:bg-coffee-50'}"
                onclick={(e) => {
                  e.stopPropagation();
                  handleAction(item.fn);
                }}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Content Area -->
  <div class="flex flex-1 flex-col p-3">
    <h3 class="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-coffee-900">
      {product.name}
    </h3>

    {#if auth.isOwner && product.price_to_outlet !== undefined}
      <p class="mt-1.5 text-sm font-bold text-coffee-900">
        {formatRupiah(product.price_to_outlet)}
      </p>
    {/if}
  </div>
</article>
