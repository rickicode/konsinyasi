/// Login response from backend.
class LoginResponse {
  const LoginResponse({
    required this.id,
    required this.email,
    required this.username,
    required this.name,
    required this.role,
    this.accessToken,
    this.refreshToken,
    this.tokenType,
  });

  final String id;
  final String email;
  final String username;
  final String name;
  final String role;
  final String? accessToken;
  final String? refreshToken;
  final String? tokenType;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      id: json['id'] as String,
      email: json['email'] as String,
      username: json['username'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      accessToken: json['access_token'] as String?,
      refreshToken: json['refresh_token'] as String?,
      tokenType: json['token_type'] as String?,
    );
  }
}

/// Login request body.
class LoginRequest {
  const LoginRequest({
    required this.username,
    required this.password,
    this.device = 'mobile',
  });

  final String username;
  final String password;
  final String device;

  Map<String, dynamic> toJson() => {
        'username': username,
        'password': password,
        'device': device,
      };
}
