import 'package:dio/dio.dart';

import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/data/models/auth_model.dart';
import 'package:konsi_mobile/data/models/user_model.dart';

class AuthApi {
  AuthApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  factory AuthApi.create() => AuthApi(dio: createDioClient());

  Future<LoginResponse> login(LoginRequest request) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConfig.login,
      data: request.toJson(),
    );
    final data = response.data!;
    return LoginResponse.fromJson(data);
  }

  Future<void> logout() async {
    await _dio.post<Map<String, dynamic>>(ApiConfig.logout);
  }

  Future<UserModel> getMe() async {
    final response = await _dio.get<Map<String, dynamic>>(ApiConfig.me);
    final data = response.data;
    if (data == null) {
      throw Exception('User data kosong');
    }
    return UserModel.fromJson(data);
  }
}
