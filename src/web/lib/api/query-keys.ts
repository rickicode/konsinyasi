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
	visits: {
		prep: (outletId: string) => ['visits', 'prep', outletId] as const,
		history: ['visits', 'history'] as const,
	},
	reports: {
		summary: (filters: ReportFilters) => ['reports', filters] as const,
		export: (filters: ReportFilters) => ['reports', 'export', filters] as const,
	},
	media: (key: string) => ['media', key] as const,
};

export interface ReportFilters {
	from: string;
	to: string;
	user_id?: string;
}
