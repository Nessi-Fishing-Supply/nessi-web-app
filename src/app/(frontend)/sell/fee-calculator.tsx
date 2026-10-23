'use client';

import { useState } from 'react';
import { calculateFee, calculateNet, formatPrice } from '@/features/shared/utils/format';
import styles from './fee-calculator.module.scss';

const COMPETITORS = [
  { name: 'eBay', rateLabel: '~13.25%', rate: 0.1325 },
  { name: 'Tackle Traders', rateLabel: '~10%', rate: 0.1 },
];

export default function FeeCalculator() {
  const [inputValue, setInputValue] = useState('');

  const cents = inputValue ? Math.round(parseFloat(inputValue) * 100) : 0;
  const isValid = cents > 0 && !isNaN(cents);

  const nessieFee = isValid ? calculateFee(cents) : 0;
  const nessieNet = isValid ? calculateNet(cents) : 0;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>See what you keep</h2>
        <p className={styles.subheading}>
          Enter your sale price to see the exact fee and your payout.
        </p>

        <div className={styles.inputGroup}>
          <label htmlFor="sale-price" className={styles.label}>
            Sale price
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol} aria-hidden="true">
              $
            </span>
            <input
              id="sale-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={styles.input}
              aria-label="Sale price in dollars"
              aria-describedby="fee-results"
            />
          </div>
        </div>

        <div id="fee-results" aria-live="polite" className={styles.results}>
          {isValid ? (
            <>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Nessi fee</span>
                <span className={styles.resultValue}>−{formatPrice(nessieFee)}</span>
              </div>
              <div className={styles.divider} role="separator" />
              <div className={`${styles.resultRow} ${styles.resultRowNet}`}>
                <span className={styles.resultLabelNet}>You receive</span>
                <span className={styles.resultValueNet}>{formatPrice(nessieNet)}</span>
              </div>
            </>
          ) : (
            <p className={styles.placeholder}>Enter a price above to see your payout.</p>
          )}
        </div>

        <div className={styles.comparisonWrapper}>
          <table className={styles.table}>
            <caption className={styles.tableCaption}>Fee comparison with other platforms</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.thPlatform}>
                  Platform
                </th>
                <th scope="col" className={styles.thFee}>
                  Fee
                </th>
                <th scope="col" className={styles.thNet}>
                  You keep
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => {
                const fee = isValid ? Math.round(cents * c.rate) : null;
                const net = isValid && fee !== null ? cents - fee : null;
                return (
                  <tr key={c.name} className={styles.trCompetitor}>
                    <td className={styles.tdPlatform}>{c.name}</td>
                    <td className={styles.tdFee}>
                      {fee !== null ? formatPrice(fee) : c.rateLabel}
                    </td>
                    <td className={styles.tdNet}>{net !== null ? formatPrice(net) : '—'}</td>
                  </tr>
                );
              })}
              <tr className={styles.trNessi}>
                <td className={styles.tdPlatformNessi}>
                  Nessi
                  <span className={styles.badge}>Best</span>
                </td>
                <td className={styles.tdFeeNessi}>
                  {isValid ? formatPrice(nessieFee) : 'as low as 6%'}
                </td>
                <td className={styles.tdNetNessi}>{isValid ? formatPrice(nessieNet) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
