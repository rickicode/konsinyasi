import type { AnalyticsFilters } from '../api/index.js';
import type { ReportPeriod } from '../../reports/stores/report-filters.svelte.js';

export type AnalyticsPeriod = ReportPeriod;

export interface PeriodOption {
  label: string;
  value: AnalyticsPeriod;
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

type FixedPeriod = Exclude<AnalyticsPeriod, 'custom'>;

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

export interface AnalyticsFilterState {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  filters: AnalyticsFilters;
  reset(): void;
}

export function createAnalyticsFilters(initialPeriod: AnalyticsPeriod = 'this-month'): AnalyticsFilterState {
  const safeInitialPeriod = (
    initialPeriod === 'custom' ? 'this-month' : initialPeriod
  ) as FixedPeriod;
  const initialRange = getPeriodRange(safeInitialPeriod);

  let period = $state<AnalyticsPeriod>(safeInitialPeriod);
  let from = $state<string>(initialRange.from);
  let to = $state<string>(initialRange.to);

  function syncPeriodRange(nextPeriod: AnalyticsPeriod) {
    if (nextPeriod !== 'custom') {
      const range = getPeriodRange(nextPeriod as FixedPeriod);
      from = range.from;
      to = range.to;
    }
  }

  const filters = $derived<AnalyticsFilters>({
    from,
    to,
  });

  return {
    get period() {
      return period;
    },
    set period(value: AnalyticsPeriod) {
      period = value;
      syncPeriodRange(value);
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
    get filters() {
      return filters;
    },
    reset() {
      period = 'this-month';
      const range = getPeriodRange('this-month');
      from = range.from;
      to = range.to;
    },
  };
}

export const analyticsFilters = createAnalyticsFilters();
