<script lang="ts">
  import { allowedMasterSections, type MasterSection } from '$lib/role.js';

  type Props = {
    /** Current user role slug. */
    role: string;
    /** Active master section. */
    active: MasterSection;
    /** Called when a tab is selected. */
    onselect: (key: MasterSection) => void;
  };

  let { role, active, onselect }: Props = $props();

  const tabs = $derived(allowedMasterSections(role));
</script>

<div class="card-master p-1">
  <div class="flex" role="tablist" aria-label="Master data">
    {#each tabs as tab (tab.key)}
      <button
        type="button"
        role="tab"
        aria-selected={active === tab.key}
        class="flex-1 min-h-11 rounded-xl px-2 py-2.5 text-xs font-bold transition-all active:scale-[0.97]"
        class:bg-coffee-700={active === tab.key}
        class:text-white={active === tab.key}
        class:text-coffee-600={active !== tab.key}
        class:hover:bg-coffee-100={active !== tab.key}
		class:active:bg-coffee-200={active !== tab.key}
        onclick={() => onselect(tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>
</div>
