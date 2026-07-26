import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/models/reports_model.dart';
import 'package:konsi_mobile/providers/reports_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(reportsProvider);
    final currency = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp',
      decimalDigits: 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Laporan'),
        actions: [
          report.whenOrNull(
            data: (data) => IconButton(
              icon: const Icon(Icons.picture_as_pdf_outlined),
              onPressed: () => _sharePdf(context, data, currency),
              tooltip: 'Bagikan PDF',
            ),
          ) ?? const SizedBox.shrink(),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(reportsProvider.future),
        color: KonsiColors.caramel,
        backgroundColor: KonsiColors.coffeeCream,
        child: report.when(
          data: (data) => _ReportBody(
            data: data,
            currency: currency,
            ref: ref,
          ),
          loading: () => const Center(
            child: CircularProgressIndicator(color: KonsiColors.caramel),
          ),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 48,
                    color: KonsiColors.berry,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(reportsProvider),
                    child: const Text('Coba Lagi'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _sharePdf(
    BuildContext context,
    ReportResponseModel data,
    NumberFormat currency,
  ) async {
    try {
      final bytes = await _generatePdf(data, currency);
      if (!context.mounted) return;
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'laporan_konsi_${data.from}_${data.to}.pdf',
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuat PDF: $e')),
      );
    }
  }

  Future<Uint8List> _generatePdf(
    ReportResponseModel data,
    NumberFormat currency,
  ) async {
    final pdf = pw.Document();
    final summary = data.summary;
    pdf.addPage(
      pw.Page(
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'Laporan Konsi',
              style: pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 8),
            pw.Text('Periode: ${data.from} s/d ${data.to}'),
            pw.SizedBox(height: 20),
            pw.Text(
              'Ringkasan',
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 8),
            _pdfRow('Total Pendapatan', currency.format(summary.totalRevenue)),
            _pdfRow('Total HPP', currency.format(summary.totalHppUsed)),
            _pdfRow('Total Margin', currency.format(summary.totalMargin)),
            _pdfRow('Total Waste', currency.format(summary.totalWaste)),
            _pdfRow('Jumlah Kunjungan', '${summary.visitCount}'),
            _pdfRow('Jumlah Override', '${summary.overrideCount}'),
            if (data.fallback) ...[
              pw.SizedBox(height: 20),
              pw.Text(
                '* Laporan ini masih menggunakan data fallback.',
                style: const pw.TextStyle(fontSize: 10),
              ),
            ],
          ],
        ),
      ),
    );
    return pdf.save();
  }

  pw.Widget _pdfRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label),
          pw.Text(
            value,
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _ReportBody extends ConsumerWidget {
  const _ReportBody({
    required this.data,
    required this.currency,
    required this.ref,
  });

  final ReportResponseModel data;
  final NumberFormat currency;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = data.summary;
    final filter = ref.watch(reportsFilterProvider);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _DateFilterSection(filter: filter),
        const SizedBox(height: 20),
        _SummaryCard(
          title: 'Total Pendapatan',
          value: currency.format(summary.totalRevenue),
          icon: Icons.payments_outlined,
          color: KonsiColors.mintLeaf,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          title: 'Total HPP',
          value: currency.format(summary.totalHppUsed),
          icon: Icons.shopping_basket_outlined,
          color: KonsiColors.caramel,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          title: 'Total Margin',
          value: currency.format(summary.totalMargin),
          icon: Icons.trending_up_outlined,
          color: KonsiColors.mintLeaf,
        ),
        const SizedBox(height: 12),
        _SummaryCard(
          title: 'Total Waste',
          value: currency.format(summary.totalWaste),
          icon: Icons.delete_outline,
          color: KonsiColors.berry,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MiniCard(
                label: 'Kunjungan',
                value: '${summary.visitCount}',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MiniCard(
                label: 'Override',
                value: '${summary.overrideCount}',
              ),
            ),
          ],
        ),
        if (data.fallback) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: KonsiColors.lemonSoft,
              borderRadius: KonsiShapes.medium,
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, color: KonsiColors.caramel),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Laporan ini menggunakan data fallback. Backend belum mengimplementasikan laporan real-time.',
                    style: TextStyle(color: KonsiColors.darkCoffee),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _DateFilterSection extends ConsumerWidget {
  const _DateFilterSection({required this.filter});

  final ReportsFilter filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dateFormat = DateFormat('yyyy-MM-dd');
    final from = filter.from != null && filter.from!.isNotEmpty
        ? DateTime.tryParse(filter.from!)
        : null;
    final to = filter.to != null && filter.to!.isNotEmpty
        ? DateTime.tryParse(filter.to!)
        : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter Tanggal',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DateButton(
                    label: 'Dari',
                    value: from,
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: from ?? DateTime.now(),
                        firstDate: DateTime(2024),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) {
                        ref.read(reportsFilterProvider.notifier).state =
                            filter.copyWith(from: dateFormat.format(picked));
                        ref.invalidate(reportsProvider);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateButton(
                    label: 'Sampai',
                    value: to,
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: to ?? DateTime.now(),
                        firstDate: DateTime(2024),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) {
                        ref.read(reportsFilterProvider.notifier).state =
                            filter.copyWith(to: dateFormat.format(picked));
                        ref.invalidate(reportsProvider);
                      }
                    },
                  ),
                ),
              ],
            ),
            if (from != null || to != null)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    ref.read(reportsFilterProvider.notifier).state =
                        const ReportsFilter();
                    ref.invalidate(reportsProvider);
                  },
                  child: const Text('Reset Filter'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dateText = value != null
        ? DateFormat('dd MMM yyyy', 'id_ID').format(value!.toLocal())
        : 'Pilih';
    return InkWell(
      onTap: onTap,
      borderRadius: KonsiShapes.medium,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: KonsiColors.coffeeFoam,
          borderRadius: KonsiShapes.medium,
          border: Border.all(color: KonsiColors.coffeeMilk),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Text(
              dateText,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: KonsiShapes.medium,
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniCard extends StatelessWidget {
  const _MiniCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
