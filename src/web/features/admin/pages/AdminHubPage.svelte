<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { BarChart3, Users, Settings, Home, FileText, Package, Store, Boxes } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';

  type AdminCard = {
    path: string;
    title: string;
    description: string;
    icon: typeof BarChart3;
    color: string;
  };

  const cards: AdminCard[] = [
    {
      path: '/master/bahan',
      title: 'Bahan Baku',
      description: 'Kelola stok dan harga bahan baku.',
      icon: Boxes,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      path: '/master/produk',
      title: 'Produk & Resep',
      description: 'Kelola produk, resep, dan HPP.',
      icon: Package,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      path: '/master/warung',
      title: 'Warung',
      description: 'Kelola data warung dan lokasi.',
      icon: Store,
      color: 'bg-orange-100 text-orange-700',
    },
    {
      path: '/laporan',
      title: 'Laporan Keuangan',
      description: 'Omzet, margin, waste, dan export PDF.',
      icon: FileText,
      color: 'bg-green-100 text-green-700',
    },
    {
      path: '/pengguna',
      title: 'Pengguna',
      description: 'Kelola karyawan, role, dan reset password.',
      icon: Users,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      path: '/pengaturan',
      title: 'Pengaturan',
      description: 'Radius geofence dan konfigurasi aplikasi.',
      icon: Settings,
      color: 'bg-gray-100 text-gray-700',
    },
    {
      path: '/beranda',
      title: 'Dashboard Owner',
      description: 'Ringkasan bisnis dan keuangan.',
      icon: BarChart3,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      path: '/beranda',
      title: 'Kembali ke Beranda',
      description: 'Kembali ke ringkasan utama.',
      icon: Home,
      color: 'bg-coffee-100 text-coffee-700',
    },
  ];
</script>

<section class="flex h-full flex-col bg-milk" aria-label="Admin">
  <header class="px-4 pb-3 pt-safe">
    <h1 class="text-xl font-bold text-coffee-900">Panel Admin</h1>
    <p class="text-sm text-coffee-500">Kelola bisnis dan data master</p>
  </header>

  <div class="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
    <div class="grid gap-3 sm:grid-cols-2">
      {#each cards as card (card.path + card.title)}
        {@const Icon = card.icon}
        <a href={card.path} use:link class="group block outline-none">
          <Card
            variant="default"
            class="h-full p-4 transition-all active:scale-[0.98] group-hover:bg-coffee-50"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {card.color} transition-colors group-hover:opacity-80"
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

    <!-- Info Box -->
    <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p class="text-sm font-medium text-blue-800">
        💡 Panel ini hanya dapat diakses oleh owner/admin. Staff lapangan tidak memiliki akses ke
        halaman ini.
      </p>
    </div>
  </div>
</section>
