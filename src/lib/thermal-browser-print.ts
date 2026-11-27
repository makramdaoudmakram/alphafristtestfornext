/**
 * Defer browser print until the thermal receipt portal has painted (Bixolon / Chrome).
 * Stock barcode printing uses a similar delay before window.print().
 */
export function scheduleThermalBrowserPrint(options: {
  onPrint: () => void;
  onAfterPrint?: () => void;
  delayMs?: number;
}): () => void {
  const delayMs = options.delayMs ?? 350;
  let cancelled = false;

  const runPrint = () => {
    if (cancelled) return;
    options.onPrint();
  };

  let outerTimer = 0;
  const frame = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      outerTimer = window.setTimeout(runPrint, delayMs);
    });
  });

  const onAfterPrint = () => {
    options.onAfterPrint?.();
  };
  window.addEventListener("afterprint", onAfterPrint);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(outerTimer);
    window.removeEventListener("afterprint", onAfterPrint);
  };
}