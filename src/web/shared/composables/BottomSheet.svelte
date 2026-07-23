<script lang="ts">
  import type { Snippet } from 'svelte';
  import Sheet from '../ui/Sheet.svelte';
  type Props = {
    title?: string;
    description?: string;
    class?: string;
    onClose?: () => void;
    trigger?: Snippet;
    children?: Snippet;
  };
  let { title, description, class: className = '', onClose, trigger, children }: Props = $props();
  let open = $state(false);
  function toggle() {
    open = !open;
  }
  function handleClose() {
    open = false;
    onClose?.();
  }
</script>

{#if trigger}
  <button
    onclick={toggle}
    type="button"
    class="inline-flex appearance-none items-center justify-center bg-transparent p-0"
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    {@render trigger()}
  </button>
{/if}

<Sheet {open} {title} {description} onClose={handleClose} class={className}>
  {#if children}
    {@render children()}
  {/if}
</Sheet>
