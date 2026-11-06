import { describe, expect, it } from "vitest";
import {
  BIXOLON_D22_LABEL_HEIGHT_MM,
  BIXOLON_D22_LABEL_WIDTH_MM,
  BIXOLON_D22_MEDIA_HEIGHT_MM,
  BIXOLON_D22_MEDIA_PITCH_MM,
  BIXOLON_D22_PAIR_GAP_MM,
  countBixolonChromePrintPages,
  countThermalBarcodeLabelPositions,
  chunkLabelsIntoPairs,
} from "@/lib/stock-barcode-bixolon-layout";

describe("chunkLabelsIntoPairs", () => {
  it("groups labels in pairs for 26 mm media", () => {
    expect(chunkLabelsIntoPairs([1, 2, 3, 4, 5])).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });
});

describe("Bixolon media geometry", () => {
  it("uses 38 mm width and 26 mm media (2×13 mm labels)", () => {
    expect(BIXOLON_D22_LABEL_WIDTH_MM).toBe(38);
    expect(BIXOLON_D22_LABEL_HEIGHT_MM).toBe(13);
    expect(BIXOLON_D22_MEDIA_HEIGHT_MM).toBe(26);
    expect(BIXOLON_D22_PAIR_GAP_MM).toBe(4);
    expect(BIXOLON_D22_MEDIA_PITCH_MM).toBe(30);
  });

  it("maps Chrome pages to media pairs without blank filler pages", () => {
    expect(countBixolonChromePrintPages(1)).toBe(1);
    expect(countBixolonChromePrintPages(2)).toBe(1);
    expect(countBixolonChromePrintPages(4)).toBe(2);
    expect(countBixolonChromePrintPages(5)).toBe(3);
    expect(countBixolonChromePrintPages(10)).toBe(5);
  });

  it("counts physical label positions separately from Chrome pages", () => {
    expect(countThermalBarcodeLabelPositions(4)).toBe(4);
  });
});
