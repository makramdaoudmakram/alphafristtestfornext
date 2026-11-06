/** Bixolon D22: 38 mm width, 13 mm per label on 26 mm media (2 labels) + 4 mm pitch gap. */
export const BIXOLON_D22_LABEL_WIDTH_MM = 38;
export const BIXOLON_D22_LABEL_HEIGHT_MM = 13;
/** One driver media position (two stacked 13 mm labels). */
export const BIXOLON_D22_MEDIA_HEIGHT_MM =
  BIXOLON_D22_LABEL_HEIGHT_MM * 2;
/** Non-printable gap after each 26 mm media block (driver pitch). */
export const BIXOLON_D22_PAIR_GAP_MM = 4;
export const BIXOLON_D22_MEDIA_PITCH_MM =
  BIXOLON_D22_MEDIA_HEIGHT_MM + BIXOLON_D22_PAIR_GAP_MM;

/** Physical label positions on the roll (one per barcode). */
export function countThermalBarcodeLabelPositions(labelCount: number): number {
  return labelCount;
}

/** Chrome print pages at 38×26 mm (one page per media pair). */
export function countBixolonChromePrintPages(labelCount: number): number {
  if (labelCount <= 0) return 0;
  return Math.ceil(labelCount / 2);
}

/** @deprecated Use countThermalBarcodeLabelPositions. */
export function countThermalBarcodePrintPages(labelCount: number): number {
  return countBixolonChromePrintPages(labelCount);
}

/** Groups labels into pairs for 26 mm Bixolon media blocks. */
export function chunkLabelsIntoPairs<T>(labels: readonly T[]): T[][] {
  const pairs: T[][] = [];
  for (let index = 0; index < labels.length; index += 2) {
    pairs.push(labels.slice(index, index + 2));
  }
  return pairs;
}
