<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  type Props = {
    class?: string;
    width?: string;
    height?: string;
    circle?: boolean;
  };
  let { class: className = '', width, height, circle = false }: Props = $props();
</script>

<div
  class={cn('animate-pulse bg-coffee-200/50', circle ? 'rounded-full' : 'rounded-xl', className)}
  style:width
  style:height
  aria-hidden="true"
></div>
