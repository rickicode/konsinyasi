<script lang="ts">
  import { cn } from '$lib/utils/cn.js';

  type Variant = 'default' | 'dashboard' | 'visit' | 'outlet' | 'master' | 'product' | 'raw';

  interface Props {
    variant?: Variant;
    children?: import('svelte').Snippet;
    header?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
    class?: string;
  }

  let { variant = 'default', children, header, footer, class: className = '' }: Props = $props();

  const baseClasses = 'rounded-2xl border bg-cream shadow-card p-4 flex flex-col gap-3';

  const variantClasses: Record<Variant, string> = {
    default: 'border-coffee-200 bg-cream',
    dashboard: 'border-orange-200 bg-section-dashboard',
    visit: 'border-pink-200 bg-section-visit',
    outlet: 'border-green-200 bg-section-outlet',
    master: 'border-purple-200 bg-section-master',
    product: 'border-amber-200 bg-section-product',
    raw: 'border-stone-200 bg-section-raw',
  };

  const computedClasses = $derived(cn(baseClasses, variantClasses[variant], className));
</script>

<article class={computedClasses}>
  {#if header}
    <header class="flex items-center justify-between gap-2">
      {@render header()}
    </header>
  {/if}

  {#if children}
    <div class="flex-1">
      {@render children()}
    </div>
  {/if}

  {#if footer}
    <footer class="flex items-center gap-2 pt-1">
      {@render footer()}
    </footer>
  {/if}
</article>
