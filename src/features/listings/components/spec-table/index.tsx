import styles from './spec-table.module.scss';

interface SpecRow {
  key: string;
  value: string;
}

interface SpecTableProps {
  specs: SpecRow[];
  className?: string;
}

export default function SpecTable({ specs, className }: SpecTableProps) {
  const visibleSpecs = specs.filter((s) => s.value.trim() !== '');

  if (visibleSpecs.length === 0) return null;

  return (
    <dl className={`${styles.table} ${className ?? ''}`}>
      {visibleSpecs.map((spec, index) => (
        <div key={spec.key} className={`${styles.row} ${index > 0 ? styles.rowDivider : ''}`}>
          <dt className={styles.key}>{spec.key}</dt>
          <dd className={styles.value}>{spec.value}</dd>
        </div>
      ))}
    </dl>
  );
}
