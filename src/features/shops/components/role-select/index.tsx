import { HiRefresh } from 'react-icons/hi';
import { SYSTEM_ROLE_IDS } from '@/features/shops/constants/roles';
import type { ShopRole } from '@/features/shops/types/permissions';
import styles from './role-select.module.scss';

interface RoleSelectProps {
  roles: ShopRole[];
  currentRoleId: string;
  onChange: (roleId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
}

export default function RoleSelect({
  roles,
  currentRoleId,
  onChange,
  disabled = false,
  loading = false,
  ariaLabel,
}: RoleSelectProps) {
  const assignableRoles = roles.filter((role) => role.id !== SYSTEM_ROLE_IDS.OWNER);

  // If current role_id doesn't match any available role (deleted custom role),
  // default to Contributor
  const isKnownRole = assignableRoles.some((role) => role.id === currentRoleId);
  const effectiveValue = isKnownRole ? currentRoleId : SYSTEM_ROLE_IDS.CONTRIBUTOR;

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={effectiveValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        aria-label={ariaLabel}
      >
        {assignableRoles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {loading && (
        <span className={styles.loading} aria-hidden="true">
          <HiRefresh />
        </span>
      )}
    </div>
  );
}
