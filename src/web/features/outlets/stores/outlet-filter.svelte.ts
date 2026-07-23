import { getContext, setContext } from 'svelte';
import type { Outlet, OutletStatus } from '@shared/schemas/outlet.schema.js';

const OUTLET_FILTER_CONTEXT_KEY = Symbol('konsi-outlet-filter-context');

type SortBy = 'name' | 'distance' | 'recent';

export interface OutletFilterState {
  /** Free-text filter against name and address. */
  readonly search: string;
  /** Active status filter. */
  readonly status: 'all' | OutletStatus;
  /** Sort mode for the list. */
  readonly sortBy: SortBy;
  /** Only show outlets with a photo. */
  readonly hasPhotoOnly: boolean;
  /** Set the search string. */
  setSearch(value: string): void;
  /** Set the status filter. */
  setStatus(value: 'all' | OutletStatus): void;
  /** Set the sort mode. */
  setSortBy(value: SortBy): void;
  /** Toggle the photo-only filter. */
  toggleHasPhotoOnly(): void;
  /** Reset all filters to their defaults. */
  reset(): void;
  /** Apply filters and sorting to an outlet list. */
  apply(outlets: Outlet[]): Outlet[];
}

function createOutletFilterState(): OutletFilterState {
  let search = $state('');
  let status = $state<'all' | OutletStatus>('all');
  let sortBy = $state<SortBy>('name');
  let hasPhotoOnly = $state(false);

  return {
    get search() {
      return search;
    },
    get status() {
      return status;
    },
    get sortBy() {
      return sortBy;
    },
    get hasPhotoOnly() {
      return hasPhotoOnly;
    },
    setSearch(value: string) {
      search = value;
    },
    setStatus(value: 'all' | OutletStatus) {
      status = value;
    },
    setSortBy(value: SortBy) {
      sortBy = value;
    },
    toggleHasPhotoOnly() {
      hasPhotoOnly = !hasPhotoOnly;
    },
    reset() {
      search = '';
      status = 'all';
      sortBy = 'name';
      hasPhotoOnly = false;
    },
    apply(outlets: Outlet[]) {
      const q = search.toLowerCase().trim();
      const filtered = outlets.filter((outlet) => {
        if (
          q &&
          !outlet.name.toLowerCase().includes(q) &&
          !outlet.address.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (status !== 'all' && outlet.status !== status) {
          return false;
        }
        if (hasPhotoOnly && !outlet.photo_key) {
          return false;
        }
        return true;
      });

      switch (sortBy) {
        case 'name':
          return filtered.sort((a, b) => a.name.localeCompare(b.name));
        case 'recent':
          return filtered.sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        case 'distance':
        default:
          // Distance sorting is location-aware; callers should sort externally when a
          // reference position is available. Default to name order to stay stable.
          return filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
    },
  };
}

/** Global outlet filter singleton. */
export const outletFilter = createOutletFilterState();

/** Provide the filter context to descendants. */
export function setOutletFilterContext(): OutletFilterState {
  const state = createOutletFilterState();
  setContext(OUTLET_FILTER_CONTEXT_KEY, state);
  return state;
}

/** Consume the filter context, falling back to the global singleton. */
export function useOutletFilter(): OutletFilterState {
  return getContext<OutletFilterState | undefined>(OUTLET_FILTER_CONTEXT_KEY) ?? outletFilter;
}
