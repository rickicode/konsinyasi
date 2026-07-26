class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.username,
    required this.name,
    required this.role,
    required this.status,
  });

  final String id;
  final String email;
  final String username;
  final String name;
  final String role;
  final String status;

  bool get isOwner => role == 'owner';
  bool get isStaff => role == 'staff';
  bool get isActive => status == 'active';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      username: json['username'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      status: json['status'] as String? ?? 'active',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'username': username,
        'name': name,
        'role': role,
        'status': status,
      };
}
