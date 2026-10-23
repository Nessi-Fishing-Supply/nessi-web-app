'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Modal from '@/components/layout/modal';
import { useShipOrder } from '@/features/orders/hooks/use-ship-order';
import { useToast } from '@/components/indicators/toast/context';
import styles from './ship-modal.module.scss';

interface ShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] as const;

export default function ShipModal({ isOpen, onClose, orderId }: ShipModalProps) {
  const titleId = useId();
  const { showToast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const trackingRef = useRef<HTMLInputElement>(null);

  const shipOrder = useShipOrder({
    onSuccess: () => {
      showToast({
        type: 'success',
        message: 'Order shipped',
        description: 'Buyer has been notified.',
      });
      setTrackingNumber('');
      setCarrier('');
      onClose();
    },
    onError: () => {
      showToast({
        type: 'error',
        message: 'Failed to ship order',
        description: 'Please try again.',
      });
    },
  });

  // Auto-focus tracking input on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => trackingRef.current?.focus());
    }
  }, [isOpen]);

  const canSubmit = trackingNumber.trim() !== '' && carrier !== '' && !shipOrder.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    shipOrder.mutate({ orderId, trackingNumber: trackingNumber.trim(), carrier });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 id={titleId} className={styles.title}>
          Mark as Shipped
        </h2>

        <div className={styles.field}>
          <label htmlFor="tracking-number" className={styles.label}>
            Tracking Number
          </label>
          <input
            ref={trackingRef}
            id="tracking-number"
            type="text"
            className={styles.input}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
            aria-required="true"
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="carrier" className={styles.label}>
            Carrier
          </label>
          <select
            id="carrier"
            className={styles.select}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            aria-required="true"
          >
            <option value="" disabled>
              Select carrier
            </option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!canSubmit}
          aria-busy={shipOrder.isPending}
        >
          {shipOrder.isPending ? 'Shipping...' : 'Mark Shipped'}
        </button>
      </form>
    </Modal>
  );
}
