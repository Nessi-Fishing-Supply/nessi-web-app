import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures the available viewport height from a ref element's position downward.
 * Returns a ref to attach to the container and a CSS height string.
 *
 * Usage:
 *   const { ref, height } = useAvailableHeight();
 *   <div ref={ref} style={{ height }}>...</div>
 */
export function useAvailableHeight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<string>('100dvh');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const top = el.getBoundingClientRect().top;
      setHeight(`${window.innerHeight - top}px`);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return { ref, height };
}
