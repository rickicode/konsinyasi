<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { BarChart3, Users, Settings, Home, FileText } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';

  type AdminCard = {
    path: string;
    title: string;
    description: string;
    icon: typeof BarChart3;
  };

  const cards: AdminCard[] = [
    {
      path: '/laporan',
      title: 'Laporan',
      description: 'Filter periode, petugas, dan export PDF.',
      icon: FileText,
    },
    {
      path: '/pengguna',
      title: 'Pengguna',
      description: 'Kelola karyawan, role, dan reset password.',
      icon: Users,
    },
    {
      path: '/pengaturan',
      title: 'Pengaturan',
      description: 'Radius geofence dan konfigurasi aplikasi.',
      icon: Settings,
    },
    {
      path: '/beranda',
      title: 'Beranda',
      description: 'Kembali ke ringkasan dan prioritas lapangan.',
      icon: Home,
    },
  ];
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Admin">
  <header class="px-4 pb-3 pt-safe">
    <h1 class="text-xl font-bold text-coffee-900">Admin</h1>
    <p class="text-sm text-coffee-500">Akses cepat untuk owner</p>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
    <div class="grid gap-3 sm:grid-cols-2">
      {#each cards as card (card.path)}
        {@const Icon = card.icon}
        <a href={card.path} use:link class="group block outline-none">
          <Card
            variant="default"
            class="h-full p-4 transition-all active:scale-[0.98] group-hover:bg-coffee-50"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-700 transition-colors group-hover:bg-coffee-200"
              >
                <Icon size={22} />
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-bold text-coffee-900">{card.title}</h2>
                <p class="mt-0.5 text-sm text-coffee-500">{card.description}</p>
              </div>
            </div>
          </Card>
        </a>
      {/each}
    </div>
  </div>
</section>
