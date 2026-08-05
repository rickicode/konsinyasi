import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { createClient } from '../db/client.js';
import { product_batches, products } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { validateUuidParam } from '../lib/validation.js';
import type { Env } from '../types.js';

const labelsPrintRoute = new Hono<Env>();

// Standalone print page - no auth required (opens in new tab)
labelsPrintRoute.get('/:batchId', async (c) => {
  const batchId = validateUuidParam(c.req.param('batchId'), 'batchId');
  const db = createClient(c.env);

  const rows = await db
    .select({
      id: product_batches.id,
      product_id: product_batches.product_id,
      product_name: products.name,
      batch_number: product_batches.batch_number,
      production_date: product_batches.production_date,
      expired_date: product_batches.expired_date,
      quantity: product_batches.quantity,
    })
    .from(product_batches)
    .leftJoin(products, eq(product_batches.product_id, products.id))
    .where(and(eq(product_batches.id, batchId), isNull(product_batches.deleted_at)))
    .limit(1);

  if (!rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Batch tidak ditemukan');
  }

  const batch = rows[0];

  if (batch.quantity <= 0) {
    throw new AppError(400, 'EMPTY_BATCH', 'Batch tidak memiliki stok');
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const prodDate = formatDate(batch.production_date);
  const expDate = formatDate(batch.expired_date);

  const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c] as string));
  const batchName = escapeHtml(batch.product_name ?? 'Produk');
  const batchNum = batch.batch_number ? escapeHtml(batch.batch_number) : '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Label - ${batch.product_name ?? 'Produk'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }

    .controls {
      position: sticky; top: 0; z-index: 10;
      background: white; border-bottom: 1px solid #e5e5e5;
      padding: 12px 16px;
      display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
    }
    .controls label { font-size: 13px; color: #666; }
    .controls select, .controls input {
      padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;
    }
    .controls input[type=number] { width: 70px; text-align: center; }
    .btn-print {
      background: #333; color: white; border: none; padding: 8px 20px;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-print:hover { background: #555; }

    .info { padding: 12px 16px; font-size: 13px; color: #666; }
    .info strong { color: #333; }

    .preview { padding: 16px; }

    .label-item {
      border: 1px dashed #999;
      text-align: center;
      page-break-inside: avoid;
      display: inline-block;
      vertical-align: top;
    }
    .label-product { font-weight: bold; line-height: 1.2; }
    .label-batch { color: #333; }
    .label-date { color: #333; line-height: 1.4; }

    @media print {
      .controls, .info { display: none !important; }
      body { background: white; }
      .preview { padding: 0; }
      .label-item { border: 1px dashed #ccc; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <label>Ukuran:
      <select id="template" onchange="renderLabels()">
        <option value="a4">A4</option>
        <option value="thermal">Thermal (58mm)</option>
      </select>
    </label>
    <label>Jumlah:
      <input type="number" id="qty" value="12" min="1" max="1000" onchange="renderLabels()" oninput="renderLabels()">
    </label>
    <button class="btn-print" onclick="window.print()">Cetak</button>
  </div>

  <div class="info">
    <strong>${batch.product_name}</strong>${batch.batch_number ? ' &middot; Batch: ' + batch.batch_number : ''} &middot; Prod: ${prodDate} &middot; Exp: ${expDate}
  </div>

  <div class="preview" id="preview"></div>

  <script>
    var batchName = '${batchName}';
    var batchNum = '${batchNum}';
    var prodDate = '${prodDate}';
    var expDate = '${expDate}';

    function renderLabels() {
      var template = document.getElementById('template').value;
      var qty = parseInt(document.getElementById('qty').value) || 1;
      var isThermal = template === 'thermal';

      var fontSize = isThermal ? '14px' : '18px';
      var smallFont = isThermal ? '11px' : '14px';
      var padding = isThermal ? '6px 8px' : '12px 16px';
      var margin = isThermal ? '2px' : '4px';
      var width = isThermal ? 'width:58mm;' : '';

      var labelContent = '<div class="label-product" style="font-size:' + fontSize + ';margin-bottom:4px">' + batchName + '</div>';
      if (batchNum) {
        labelContent += '<div class="label-batch" style="font-size:' + smallFont + ';margin-bottom:2px">Batch: ' + batchNum + '</div>';
      }
      labelContent += '<div class="label-date" style="font-size:' + smallFont + '">Prod: ' + prodDate + '</div>';
      labelContent += '<div class="label-date" style="font-size:' + smallFont + '">Exp: ' + expDate + '</div>';

      var html = '';
      for (var i = 0; i < qty; i++) {
        html += '<div class="label-item" style="padding:' + padding + ';margin:' + margin + ';' + width + '">' + labelContent + '</div>';
      }

      document.getElementById('preview').innerHTML = html;
    }

    renderLabels();
  </script>
</body>
</html>`;

  return c.html(html);
});

export default labelsPrintRoute;
