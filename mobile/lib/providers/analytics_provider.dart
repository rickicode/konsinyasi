import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:meta/meta.dart';
import 'package:konsi_mobile/data/datasources/remote/analytics_api.dart';
import 'package:konsi_mobile/data/models/analytics_model.dart';
import 'package:konsi_mobile/data/repositories/analytics_repository.dart';

final analyticsApiProvider = Provider<AnalyticsApi>((ref) {
  return AnalyticsApi(dio: ref.watch(dioProvider));
});

final analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  return AnalyticsRepository(analyticsApi: ref.watch(analyticsApiProvider));
});

/// Filter untuk analytics.
@immutable
class AnalyticsFilter {
  const AnalyticsFilter({
    this.from,
    this.to,
    this.outletId,
    this.productId,
  });

  final String? from;
  final String? to;
  final String? outletId;
  final String? productId;

  AnalyticsFilter copyWith({
    String? from,
    String? to,
    String? outletId,
    String? productId,
  }) {
    return AnalyticsFilter(
      from: from ?? this.from,
      to: to ?? this.to,
      outletId: outletId ?? this.outletId,
      productId: productId ?? this.productId,
    );
  }
}

final analyticsFilterProvider = StateProvider<AnalyticsFilter>((ref) {
  return const AnalyticsFilter();
});

/// Provider untuk analytics utama.
final analyticsProvider =
    AsyncNotifierProvider.autoDispose<AnalyticsNotifier, AnalyticsResponseModel>(
  AnalyticsNotifier.new,
);

class AnalyticsNotifier extends AutoDisposeAsyncNotifier<AnalyticsResponseModel> {
  @override
  Future<AnalyticsResponseModel> build() async {
    final filter = ref.watch(analyticsFilterProvider);
    final repository = ref.read(analyticsRepositoryProvider);
    return repository.getAnalytics(
      from: filter.from,
      to: filter.to,
      outletId: filter.outletId,
      productId: filter.productId,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final filter = ref.read(analyticsFilterProvider);
      final repository = ref.read(analyticsRepositoryProvider);
      return repository.getAnalytics(
        from: filter.from,
        to: filter.to,
        outletId: filter.outletId,
        productId: filter.productId,
      );
    });
  }
}

/// Provider untuk detail analytics outlet.
final outletAnalyticsProvider = AsyncNotifierProvider.autoDispose
    .family<OutletAnalyticsNotifier, AnalyticsOutletDetailModel, String>(
  OutletAnalyticsNotifier.new,
);

class OutletAnalyticsNotifier
    extends AutoDisposeFamilyAsyncNotifier<AnalyticsOutletDetailModel, String> {
  @override
  Future<AnalyticsOutletDetailModel> build(String outletId) async {
    final filter = ref.watch(analyticsFilterProvider);
    final repository = ref.read(analyticsRepositoryProvider);
    return repository.getOutletAnalytics(
      outletId,
      from: filter.from,
      to: filter.to,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final filter = ref.read(analyticsFilterProvider);
      final repository = ref.read(analyticsRepositoryProvider);
      return repository.getOutletAnalytics(
        arg,
        from: filter.from,
        to: filter.to,
      );
    });
  }
}

/// Provider untuk detail analytics product.
final productAnalyticsProvider = AsyncNotifierProvider.autoDispose
    .family<ProductAnalyticsNotifier, AnalyticsProductDetailModel, String>(
  ProductAnalyticsNotifier.new,
);

class ProductAnalyticsNotifier
    extends AutoDisposeFamilyAsyncNotifier<AnalyticsProductDetailModel, String> {
  @override
  Future<AnalyticsProductDetailModel> build(String productId) async {
    final filter = ref.watch(analyticsFilterProvider);
    final repository = ref.read(analyticsRepositoryProvider);
    return repository.getProductAnalytics(
      productId,
      from: filter.from,
      to: filter.to,
    );
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final filter = ref.read(analyticsFilterProvider);
      final repository = ref.read(analyticsRepositoryProvider);
      return repository.getProductAnalytics(
        arg,
        from: filter.from,
        to: filter.to,
      );
    });
  }
}
