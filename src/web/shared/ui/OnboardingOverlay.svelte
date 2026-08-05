<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import Icon from './icons/Icon.svelte';

  type Step = {
    title: string;
    description: string;
    icon: string;
    position: 'top' | 'center' | 'bottom';
  };

  const steps: Step[] = [
    {
      title: 'Selamat Datang di Konsi! 👋',
      description: 'Konsi membantu Anda mengelola kunjungan konsinyasi ke warung. Mari kita lihat cara kerjanya.',
      icon: 'home',
      position: 'center'
    },
    {
      title: 'Prioritas Warung',
      description: 'Warung dengan stok merah (>4 hari) wajib ditarik. Ketuk warung untuk melihat detail dan memulai kunjungan.',
      icon: 'alert-triangle',
      position: 'top'
    },
    {
      title: 'Memulai Kunjungan',
      description: 'Ketuk warung dari daftar Prioritas, lalu pilih "Mulai Kunjungan". Anda akan diminta menarik stok lama dan menitipkan stok baru.',
      icon: 'map-pin',
      position: 'center'
    },
    {
      title: 'Validasi Otomatis',
      description: 'Sistem akan memeriksa jarak GPS, jumlah stok, dan kelengkapan data sebelum mengirim. Semua pesan error menjelaskan cara memperbaiki.',
      icon: 'check-circle',
      position: 'center'
    },
    {
      title: 'Siap Bekerja! 🎉',
      description: 'Anda siap memulai kunjungan pertama. Ingat: warung merah wajib ditarik, dan draft tersimpan otomatis saat offline.',
      icon: 'package',
      position: 'center'
    }
  ];

  let currentStep = $state(0);
  let isVisible = $state(false);

  onMount(() => {
    const completed = localStorage.getItem('konsi-onboarding-completed');
    if (!completed) {
      isVisible = true;
    }
  });

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      completeOnboarding();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  function skipOnboarding() {
    completeOnboarding();
  }

  function completeOnboarding() {
    localStorage.setItem('konsi-onboarding-completed', 'true');
    isVisible = false;
  }

  const step = $derived(steps[currentStep]);
  const progress = $derived(((currentStep + 1) / steps.length) * 100);
  const isFirstStep = $derived(currentStep === 0);
  const isLastStep = $derived(currentStep === steps.length - 1);
</script>

{#if isVisible}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-coffee-950/60 backdrop-blur-sm">
    <div class="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-float">
      <!-- Progress bar -->
      <div class="h-1 bg-coffee-100">
        <div
          class="h-full bg-coffee-700 transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>

      <!-- Content -->
      <div class="p-6 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100"
        >
          <Icon name={step.icon} size={32} class="text-coffee-700" />
        </div>

        <h2 class="text-lg font-bold text-coffee-900">{step.title}</h2>
        <p class="mt-2 text-sm text-coffee-600 leading-relaxed">{step.description}</p>
      </div>

      <!-- Navigation -->
      <div class="flex items-center justify-between border-t border-coffee-100 px-6 py-4">
        <div>
          {#if isFirstStep}
            <button
              type="button"
              class="text-sm font-medium text-coffee-500 transition-colors hover:text-coffee-700"
              onclick={skipOnboarding}
            >
              Lewati
            </button>
          {:else}
            <button
              type="button"
              class="flex items-center gap-1 text-sm font-medium text-coffee-500 transition-colors hover:text-coffee-700"
              onclick={prevStep}
            >
              <Icon name="arrow-left" size={16} />
              Kembali
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          {#each steps as _, i}
            <div
              class="h-2 w-2 rounded-full transition-colors {i === currentStep ? 'bg-coffee-700' : 'bg-coffee-200'}"
            ></div>
          {/each}
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onclick={nextStep}
        >
          {isLastStep ? 'Mulai Bekerja' : 'Lanjut'}
        </Button>
      </div>
    </div>
  </div>
{/if}
