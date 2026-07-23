/* eslint-disable svelte/prefer-svelte-reactivity -- helper functions use plain Date math, not component state */
import type { ReportFilters } from '$lib/api/query-keys.js';

export type ReportPeriod = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

export interface PeriodOption {
  label: string;
  value: ReportPeriod;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Minggu ini', value: 'this-week' },
  { label: 'Minggu lalu', value: 'last-week' },
  { label: 'Bulan ini', value: 'this-month' },
  { label: 'Bulan lalu', value: 'last-month' },
  { label: 'Rentang kustom', value: 'custom' },
];

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type FixedPeriod = Exclude<ReportPeriod, 'custom'>;

function getPeriodRange(period: FixedPeriod): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'this-week': {
      const from = startOfWeek(today);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'last-week': {
      const thisMonday = startOfWeek(today);
      const from = addDays(thisMonday, -7);
      const to = addDays(thisMonday, -1);
      return { from: toISODate(from), to: toISODate(to) };
    }
    case 'this-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toISODate(from), to: toISODate(to) };
    }
    case 'last-month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISODate(from), to: toISODate(to) };
    }
    default: {
      const _exhaustive: never = period;
      throw new Error(`Periode tidak dikenal: ${_exhaustive}`);
    }
  }
}

export interface ReportFilterState {
  period: ReportPeriod;
  from: string;
  to: string;
  user_id: string;
  filters: ReportFilters;
  reset(): void;
}

export function createReportFilters(initialPeriod: ReportPeriod = 'this-month'): ReportFilterState {
  const safeInitialPeriod = (
    initialPeriod === 'custom' ? 'this-month' : initialPeriod
  ) as FixedPeriod;
  const initialRange = getPeriodRange(safeInitialPeriod);

  let period = $state<ReportPeriod>(safeInitialPeriod);
  let from = $state<string>(initialRange.from);
  let to = $state<string>(initialRange.to);
  let user_id = $state<string>('');

  $effect(() => {
    if (period !== 'custom') {
      const fixedPeriod = period as FixedPeriod;
      const range = getPeriodRange(fixedPeriod);
      from = range.from;
      to = range.to;
    }
  });

  const filters = $derived<ReportFilters>({
    from,
    to,
    user_id: user_id || undefined,
  });

  return {
    get period() {
      return period;
    },
    set period(value: ReportPeriod) {
      period = value;
    },
    get from() {
      return from;
    },
    set from(value: string) {
      from = value;
    },
    get to() {
      return to;
    },
    set to(value: string) {
      to = value;
    },
    get user_id() {
      return user_id;
    },
    set user_id(value: string) {
      user_id = value;
    },
    get filters() {
      return filters;
    },
    reset() {
      period = 'this-month';
      const range = getPeriodRange('this-month');
      from = range.from;
      to = range.to;
      user_id = '';
    },
  };
}

export const reportFilters = createReportFilters();
