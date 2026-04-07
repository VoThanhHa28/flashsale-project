/**
 * Chuẩn hóa mã role từ user lưu localStorage (sau login /auth/me).
 * BE trả usr_role dạng object { roleCode, roleName } hoặc legacy string.
 */
export function getUserRoleCode(user) {
  if (!user) return '';
  const r = user.usr_role;
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object' && r.roleCode != null) return String(r.roleCode);
  if (user.role && typeof user.role === 'string') return user.role;
  return '';
}
