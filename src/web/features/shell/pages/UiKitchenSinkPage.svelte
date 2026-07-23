<script lang="ts">
  import Button from '../../../shared/ui/Button.svelte';

  const variants: Array<'primary' | 'secondary' | 'ghost' | 'danger' | 'success'> = [
    'primary',
    'secondary',
    'ghost',
    'danger',
    'success',
  ];
  const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
</script>

<div class="space-y-10 py-6">
  <section>
    <h2 class="mb-4 text-lg font-bold text-coffee-900">Button Variants</h2>
    <div class="flex flex-wrap items-center gap-3">
      {#each variants as variant (variant)}
        <Button {variant}>
          {variant}
        </Button>
      {/each}
    </div>
  </section>

  <section>
    <h2 class="mb-4 text-lg font-bold text-coffee-900">Button Sizes</h2>
    <div class="flex flex-wrap items-center gap-3">
      {#each sizes as size (size)}
        <Button {size}>
          {size}
        </Button>
      {/each}
    </div>
  </section>

  <section>
    <h2 class="mb-4 text-lg font-bold text-coffee-900">Button States</h2>
    <div class="flex flex-wrap items-center gap-3">
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button fullWidth>Full Width</Button>
    </div>
  </section>

  <section>
    <h2 class="mb-4 text-lg font-bold text-coffee-900">Card Utilities</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="card-dashboard text-sm font-semibold">card-dashboard</div>
      <div class="card-visit text-sm font-semibold">card-visit</div>
      <div class="card-outlet text-sm font-semibold">card-outlet</div>
      <div class="card-master text-sm font-semibold">card-master</div>
      <div class="card-product text-sm font-semibold">card-product</div>
      <div class="card-raw text-sm font-semibold">card-raw</div>
      <div class="card-cream text-sm font-semibold">card-cream</div>
    </div>
  </section>
</div>
