import { describe, expect, it } from "vitest";
import {
  canDeletePharmReciveDocument,
  canEditPharmReciveSavedDocument,
  isKnownPharmReciveMovFlag,
  isPharmReciveAccepted,
  isPharmReciveFormEditable,
  isPharmRecivePendingAcceptance,
  PHARM_RECIVE_MOV_FLAG_ACCEPTED,
  PHARM_RECIVE_MOV_FLAG_PENDING,
} from "@/lib/pharm-recive-document-state";

describe("pharm-recive document MovFlag guards", () => {
  it("treats legacy 0 and pending 1 as pending acceptance", () => {
    expect(isPharmRecivePendingAcceptance(0)).toBe(true);
    expect(isPharmRecivePendingAcceptance(PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(true);
    expect(isPharmRecivePendingAcceptance(PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
  });

  it("disallows editing any saved pending or accepted document", () => {
    expect(canEditPharmReciveSavedDocument(10, 0)).toBe(false);
    expect(canEditPharmReciveSavedDocument(10, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(false);
    expect(canEditPharmReciveSavedDocument(10, PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
    expect(canEditPharmReciveSavedDocument(null, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(false);
  });

  it("allows delete only for pending saved documents", () => {
    expect(canDeletePharmReciveDocument(5, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(true);
    expect(canDeletePharmReciveDocument(5, 0)).toBe(true);
    expect(canDeletePharmReciveDocument(5, PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
  });

  it("allows form edit only for new documents", () => {
    expect(isPharmReciveFormEditable("new", null, null)).toBe(true);
    expect(isPharmReciveFormEditable("view", 1, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(false);
    expect(isPharmReciveFormEditable("edit", 1, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(false);
  });

  it("does not infer reservation from MovFlag alone", () => {
    expect(isPharmReciveAccepted(PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(false);
    expect(isPharmRecivePendingAcceptance(PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
  });

  it("disables edit and delete for saved documents when MovFlag is null, missing, or invalid", () => {
    expect(isKnownPharmReciveMovFlag(null)).toBe(false);
    expect(isKnownPharmReciveMovFlag(undefined)).toBe(false);
    expect(isKnownPharmReciveMovFlag(Number.NaN)).toBe(false);
    expect(isKnownPharmReciveMovFlag(99)).toBe(false);

    expect(canEditPharmReciveSavedDocument(10, null)).toBe(false);
    expect(canEditPharmReciveSavedDocument(10, undefined)).toBe(false);
    expect(canEditPharmReciveSavedDocument(10, Number.NaN)).toBe(false);
    expect(canEditPharmReciveSavedDocument(10, 99)).toBe(false);

    expect(canDeletePharmReciveDocument(10, null)).toBe(false);
    expect(canDeletePharmReciveDocument(10, undefined)).toBe(false);
    expect(canDeletePharmReciveDocument(10, 99)).toBe(false);
  });

  it("still allows pending delete and blocks accepted actions for normal MovFlag values", () => {
    expect(canDeletePharmReciveDocument(5, 0)).toBe(true);
    expect(canDeletePharmReciveDocument(5, PHARM_RECIVE_MOV_FLAG_PENDING)).toBe(true);
    expect(canDeletePharmReciveDocument(5, PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
    expect(canEditPharmReciveSavedDocument(5, PHARM_RECIVE_MOV_FLAG_ACCEPTED)).toBe(false);
  });
});
