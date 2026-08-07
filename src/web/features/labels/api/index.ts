export type ProductBatch = {
  id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  production_date: string;
  expired_date: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateBatchInput = {
  product_id: string;
  production_date: string;
  expired_date: string;
  quantity?: number;
  notes?: string | null;
};

export type UpdateBatchInput = {
  product_id?: string;
  production_date?: string;
  expired_date?: string;
  quantity?: number;
  notes?: string | null;
};

export async function fetchBatches(productId?: string): Promise<ProductBatch[]> {
  const params = new URLSearchParams();
  if (productId) params.set('product_id', productId);
  const qs = params.toString();
  const res = await fetch(`/api/labels/batches${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Gagal memuat batch');
  return res.json();
}

export async function fetchBatch(id: string): Promise<ProductBatch> {
  const res = await fetch(`/api/labels/batches/${id}`);
  if (!res.ok) throw new Error('Batch tidak ditemukan');
  return res.json();
}

export async function createBatch(input: CreateBatchInput): Promise<ProductBatch> {
  const res = await fetch('/api/labels/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Gagal membuat batch');
  }
  return res.json();
}

export async function updateBatch(id: string, input: UpdateBatchInput): Promise<ProductBatch> {
  const res = await fetch(`/api/labels/batches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Gagal mengupdate batch');
  }
  return res.json();
}

export async function deleteBatch(id: string): Promise<void> {
  const res = await fetch(`/api/labels/batches/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus batch');
}

export function labelGenerateUrl(batchId: string, qty: number, template: 'thermal' | 'a4'): string {
  return `/api/labels/print/${encodeURIComponent(batchId)}?qty=${qty}&template=${template}`;
}

// Product picker types
export type ProductPicker = {
  id: string;
  name: string;
  price: number;
};

export async function fetchProducts(): Promise<ProductPicker[]> {
  const res = await fetch('/api/products/picker');
  if (!res.ok) throw new Error('Gagal memuat produk');
  return res.json();
}
