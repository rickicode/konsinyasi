<script lang="ts">
  import { formatRupiah } from '$lib/utils/format.js';
  import { getAuth } from '$lib/stores/auth.svelte.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Icon from '../../../shared/ui/icons/Icon.svelte';
  import type { Product } from '@shared/schemas/product.schema.js';

  type Props = {
    product: Product;
    onclick?: () => void;
  };

  let { product, onclick }: Props = $props();
  const auth = getAuth();

  const statusLabel: Record<Product['status'], string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
  };
</script>

<button
  type="button"
  {onclick}
  class="group w-full text-left transition-transform active:scale-[0.98]"
  aria-label={`Lihat detail ${product.name}`}
>
  <Card variant="product">
    {#snippet header()}
      <div
        class="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-coffee-100 text-coffee-400"
      >
        <Icon name="package" size={40} class="transition-colors group-hover:text-coffee-600" />
      </div>
    {/snippet}

    <div class="space-y-2">
      <h3 class="line-clamp-2 text-base font-bold text-coffee-900">{product.name}</h3>
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        class:bg-success-bg={product.status === 'active'}
        class:text-success={product.status === 'active'}
        class:bg-coffee-100={product.status === 'inactive'}
        class:text-coffee-500={product.status === 'inactive'}
      >
        {statusLabel[product.status]}
      </span>
      {#if auth.isOwner && product.price_to_outlet !== undefined}
        <p class="pt-1 text-sm font-semibold text-coffee-900">
          {formatRupiah(product.price_to_outlet)}
          <span class="font-normal text-coffee-500">ke outlet</span>
        </p>
      {/if}
    </div>
  </Card>
</button>
