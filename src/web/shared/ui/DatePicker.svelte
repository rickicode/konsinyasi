<script lang="ts">
  import { Calendar, ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn.js';

  interface Props {
    label?: string;
    value?: string;
    onchange?: (value: string) => void;
    disabled?: boolean;
    min?: string;
    max?: string;
    class?: string;
  }

  let {
    label,
    value = '',
    onchange,
    disabled = false,
    min,
    max,
    class: className = '',
  }: Props = $props();

  let isOpen = $state(false);
  let viewDate = $state(value ? parseDate(value) : new Date());
  let containerRef = $state<HTMLDivElement | null>(null);

  function parseDate(str: string): Date {
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  }

  function formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplay(str: string): string {
    if (!str) return 'Pilih tanggal';
    const d = parseDate(str);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const daysInMonth = $derived(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate());
  const firstDayOfMonth = $derived(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay());
  const monthName = $derived(viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));

  const calendarDays = $derived.by(() => {
    const days: (number | null)[] = [];
    // Adjust for Monday start (Indonesian standard)
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  });

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  }

  function isSelected(day: number): boolean {
    if (!value) return false;
    const selected = parseDate(value);
    return (
      day === selected.getDate() &&
      viewDate.getMonth() === selected.getMonth() &&
      viewDate.getFullYear() === selected.getFullYear()
    );
  }

  function isDisabled(day: number): boolean {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = formatDate(date);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  }

  function selectDay(day: number) {
    if (isDisabled(day)) return;
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = formatDate(selected);
    onchange?.(formatted);
    isOpen = false;
  }

  function prevMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  }

  function handleToggle() {
    if (disabled) return;
    isOpen = !isOpen;
    if (isOpen && value) {
      viewDate = parseDate(value);
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
    }
  });
</script>

<div class={cn('relative flex flex-col gap-1.5', className)} bind:this={containerRef}>
  {#if label}
    <span class="text-sm font-medium text-coffee-800">{label}</span>
  {/if}

  <!-- Trigger button -->
  <button
    type="button"
    onclick={handleToggle}
    {disabled}
    class="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-cream px-4 text-left text-base transition-colors
      {disabled
        ? 'cursor-not-allowed opacity-60 border-coffee-200'
        : isOpen
          ? 'border-coffee-500 ring-2 ring-coffee-300/50'
          : 'border-coffee-200 hover:border-coffee-300'}
      {value ? 'text-coffee-900' : 'text-coffee-400'}"
  >
    <Calendar size={18} class="shrink-0 text-coffee-400" />
    <span class="flex-1 truncate">{formatDisplay(value)}</span>
  </button>

  <!-- Dropdown calendar -->
  {#if isOpen}
    <div class="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] rounded-2xl border border-coffee-200 bg-white p-4 shadow-lg">
      <!-- Month navigation -->
      <div class="mb-3 flex items-center justify-between">
        <button
          type="button"
          onclick={prevMonth}
          class="rounded-lg p-1.5 text-coffee-600 transition-colors hover:bg-coffee-100"
        >
          <ChevronLeft size={18} />
        </button>
        <span class="text-sm font-bold text-coffee-900">{monthName}</span>
        <button
          type="button"
          onclick={nextMonth}
          class="rounded-lg p-1.5 text-coffee-600 transition-colors hover:bg-coffee-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <!-- Day headers -->
      <div class="mb-1 grid grid-cols-7 gap-1">
        {#each ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as dayName}
          <div class="text-center text-[10px] font-semibold text-coffee-400">
            {dayName}
          </div>
        {/each}
      </div>

      <!-- Calendar grid -->
      <div class="grid grid-cols-7 gap-1">
        {#each calendarDays as day}
          {#if day === null}
            <div class="h-9"></div>
          {:else}
            <button
              type="button"
              onclick={() => selectDay(day)}
              disabled={isDisabled(day)}
              class="flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all
                {isSelected(day)
                  ? 'bg-coffee-700 text-white'
                  : isToday(day)
                    ? 'bg-coffee-100 text-coffee-900 font-bold'
                    : isDisabled(day)
                      ? 'text-coffee-300 cursor-not-allowed'
                      : 'text-coffee-700 hover:bg-coffee-100'}"
            >
              {day}
            </button>
          {/if}
        {/each}
      </div>

      <!-- Quick actions -->
      <div class="mt-3 flex gap-2 border-t border-coffee-100 pt-3">
        <button
          type="button"
          onclick={() => { onchange?.(formatDate(new Date())); isOpen = false; }}
          class="flex-1 rounded-lg bg-coffee-100 px-3 py-2 text-xs font-semibold text-coffee-700 transition-colors hover:bg-coffee-200"
        >
          Hari ini
        </button>
        <button
          type="button"
          onclick={() => { onchange?.(''); isOpen = false; }}
          class="flex-1 rounded-lg bg-coffee-100 px-3 py-2 text-xs font-semibold text-coffee-700 transition-colors hover:bg-coffee-200"
        >
          Reset
        </button>
      </div>
    </div>
  {/if}
</div>
