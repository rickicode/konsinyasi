<script lang="ts">
  /**
   * Legacy DashboardPage - redirects to role-specific dashboard
   * This file is kept for backward compatibility
   */
  import { onMount } from 'svelte';
  import { replace } from '@keenmate/svelte-spa-router';
  import { getAuth } from '$lib/stores/auth.svelte.js';

  const auth = getAuth();

  onMount(() => {
    // Redirect to the appropriate dashboard based on role
    if (auth.isOwner) {
      replace('/beranda');
    } else {
      replace('/beranda');
    }
  });
</script>

<div class="flex min-h-screen items-center justify-center">
  <p class="text-sm text-coffee-500">Mengalihkan...</p>
</div>
