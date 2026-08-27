import {
  applyMovementStoToDetails,
  applyMovementToHeader,
  computeDeletedDetailIds,
  createEmptyDetailRow,
  displaySearchMovementName,
  documentToFormValues,
  emptyPurchaseHeader,
  filterDetailsWithItemCode,
  headerToFormValues,
  mapDetailFromApi,
  mapHeaderFromApi,
  mapSearchResultFromApi,
  mergeSavedDetailsWithPrior,
  toUpsertPayload,
} from "@/lib/purchase.mapper";
import type {
  ReturnDetail,
  ReturnDocument,
  ReturnHeader,
  ReturnSearchResult,
  ReturnUpsertPayload,
} from "@/types/return";

export {
  applyMovementStoToDetails,
  applyMovementToHeader,
  computeDeletedDetailIds,
  createEmptyDetailRow,
  displaySearchMovementName,
  documentToFormValues,
  filterDetailsWithItemCode,
  headerToFormValues,
  mapSearchResultFromApi,
  mergeSavedDetailsWithPrior,
  toUpsertPayload,
};

export const emptyReturnHeader = emptyPurchaseHeader;

export function mapDocumentFromApi(raw: Record<string, unknown>): ReturnDocument {
  const headerSource =
    (raw.header as Record<string, unknown> | undefined) ??
    (raw.Header as Record<string, unknown> | undefined) ??
    (raw.document as Record<string, unknown> | undefined) ??
    (raw.Document as Record<string, unknown> | undefined) ??
    raw;

  const detailsRaw =
    (headerSource.returnTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.ReturnTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.purTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.PurTransDetails as Record<string, unknown>[] | undefined) ??
    (headerSource.details as Record<string, unknown>[] | undefined) ??
    (raw.returnTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.ReturnTransDetails as Record<string, unknown>[] | undefined) ??
    (raw.details as Record<string, unknown>[] | undefined) ??
    [];

  return {
    header: mapHeaderFromApi(headerSource) as ReturnHeader,
    details: detailsRaw.map((line) => mapDetailFromApi(line) as ReturnDetail),
  };
}

export function mapSaveResponseFromApi(raw: Record<string, unknown>): ReturnDocument {
  const hasEnvelope = raw.document != null || raw.Document != null;
  const documentRaw = hasEnvelope
    ? ((raw.document ?? raw.Document) as Record<string, unknown>)
    : raw;
  return mapDocumentFromApi(documentRaw);
}

export type { ReturnDocument, ReturnHeader, ReturnDetail, ReturnSearchResult, ReturnUpsertPayload };
