export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  settings: {
    all: ['settings'] as const,
    geofence: ['settings', 'geofence'] as const,
    brand: ['settings', 'brand'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  outlets: {
    all: ['outlets'] as const,
    detail: (id: string) => ['outlets', id] as const,
    photo: (id: string) => ['outlets', id, 'photo'] as const,
  },
  products: {
    all: ['products'] as const,
    detail: (id: string) => ['products', id] as const,
    picker: ['products', 'picker'] as const,
  },
  rawMaterials: {
    all: ['raw-materials'] as const,
    detail: (id: string) => ['raw-materials', id] as const,
  },
  uoms: {
    all: ['uoms'] as const,
    detail: (id: string) => ['uoms', id] as const,
  },
  visits: {
    prep: (outletId: string) => ['visits', 'prep', outletId] as const,
    history: ['visits', 'history'] as const,
    byOutlet: (outletId: string) => ['visits', 'outlet', outletId] as const,
    photos: (visitId: string) => ['visits', visitId, 'photos'] as const,
    receiptPhotos: (visitId: string) => ['visits', visitId, 'receipt-photos'] as const,
  },
  reports: {
    summary: (filters: ReportFilters) => ['reports', filters] as const,
    export: (filters: ReportFilters) => ['reports', 'export', filters] as const,
  },
  analytics: {
    summary: (filters: AnalyticsFilters) => ['analytics', filters] as const,
    outlet: (id: string, filters: Pick<AnalyticsFilters, 'from' | 'to'>) => ['analytics', 'outlet', id, filters] as const,
    product: (id: string, filters: Pick<AnalyticsFilters, 'from' | 'to'>) => ['analytics', 'product', id, filters] as const,
    waste: (filters: Pick<AnalyticsFilters, 'from' | 'to'>) => ['analytics', 'waste', filters] as const,
    trend: (filters: Pick<AnalyticsFilters, 'from' | 'to'>) => ['analytics', 'trend', filters] as const,
  },
  staffReport: {
    summary: (period: string) => ['staff-report', period] as const,
  },
  media: (key: string) => ['media', key] as const,
};

export interface ReportFilters {
  from: string;
  to: string;
  outlet_id?: string;
  user_id?: string;
}

export interface AnalyticsFilters {
  from: string;
  to: string;
  outlet_id?: string;
  product_id?: string;
}

export interface StaffReportFilters {
  period: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-month';
}
