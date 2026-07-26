import type {
  ItemCatalogItem,
  ItemCatalogUpsertRequest,
} from "@/types/item-catalog";

/** Primary key for ItemCatalog API routes (Id, fallback ItemCatalogId). */
export function resolveItemCatalogApiId(row: Pick<ItemCatalogItem, "id" | "itemCatalogId">): number | null {
  if (row.id > 0) return row.id;
  if (row.itemCatalogId > 0) return row.itemCatalogId;
  return null;
}

export type ItemCatalogFormValues = {
  itmCode: string;
  itmCode2: string;
  itmIntCode: string;
  itmNameAr: string;
  itmNameEn: string;
  itmDefSellPrice: string;
  itmDefPharmPrice: string;
  itmDefTax: string;
  itmHasExpire: boolean;
  itmIsmedicine: boolean;
  itmActive: boolean;
  itmStopSell: boolean;
  itmSrvc: boolean;
  itmStopPur: boolean;
  itmPrintBarcode: boolean;
  itmAllowDiscount: boolean;
  itmFreez: boolean;
  comId: string;
  itmOrigin: string;
  itmGroup: string;
  itemForm: string;
  itmNotes: string;
  itmMaxDiscPer: string;
  itmMaxDiscVal: string;
  itmUnit1: string;
  itmUnit2: string;
  itmUnit3: string;
  itmUnit1Unit2: string;
  itmUnit1Unit3: string;
  itmComCode: string;
  itmLocation: string;
  itmRequestLimit: string;
  itmMaxLimit: string;
  itmMinLimit: string;
  itmDefaultLimit: string;
  itmPurchaseUnit: string;
  itmSellUnit: string;
  itmScientificN1: string;
  itmScientificN2: string;
  itmG1: string;
  itmG2: string;
  itmG3: string;
  itmScientificGroupId: string;
  itmUsageMannerId: string;
  itmIsShortage: string;
  itmMidUnitDif: string;
  itmSmallUnitDif: string;
  itmFracQty: string;
  itmFavourite: string;
  ucpCode: string;
  itmSalesDisc: string;
  itmNopurreturn: string;
  itmSellNostock: string;
  itmGId: string;
};

export const emptyItemCatalogFormValues: ItemCatalogFormValues = {
  itmCode: "",
  itmCode2: "",
  itmIntCode: "",
  itmNameAr: "",
  itmNameEn: "",
  itmDefSellPrice: "",
  itmDefPharmPrice: "",
  itmDefTax: "",
  itmHasExpire: false,
  itmIsmedicine: false,
  itmActive: true,
  itmStopSell: false,
  itmSrvc: false,
  itmStopPur: false,
  itmPrintBarcode: true,
  itmAllowDiscount: true,
  itmFreez: false,
  comId: "",
  itmOrigin: "",
  itmGroup: "",
  itemForm: "",
  itmNotes: "",
  itmMaxDiscPer: "",
  itmMaxDiscVal: "",
  itmUnit1: "",
  itmUnit2: "",
  itmUnit3: "",
  itmUnit1Unit2: "",
  itmUnit1Unit3: "",
  itmComCode: "",
  itmLocation: "",
  itmRequestLimit: "",
  itmMaxLimit: "",
  itmMinLimit: "",
  itmDefaultLimit: "",
  itmPurchaseUnit: "",
  itmSellUnit: "",
  itmScientificN1: "",
  itmScientificN2: "",
  itmG1: "",
  itmG2: "",
  itmG3: "",
  itmScientificGroupId: "",
  itmUsageMannerId: "",
  itmIsShortage: "",
  itmMidUnitDif: "",
  itmSmallUnitDif: "",
  itmFracQty: "",
  itmFavourite: "",
  ucpCode: "",
  itmSalesDisc: "",
  itmNopurreturn: "",
  itmSellNostock: "",
  itmGId: "",
};

function toInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseOptionalFloat(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalShort(value: string): number | null {
  const parsed = parseOptionalInt(value);
  if (parsed === null) return null;
  return parsed;
}

export function itemCatalogToFormValues(item: ItemCatalogItem): ItemCatalogFormValues {
  const child = item.child;

  return {
    itmCode: toInput(item.itmCode),
    itmCode2: toInput(item.itmCode2),
    itmIntCode: toInput(item.itmIntCode),
    itmNameAr: toInput(item.itmNameAr),
    itmNameEn: toInput(item.itmNameEn),
    itmDefSellPrice: toInput(item.itmDefSellPrice),
    itmDefPharmPrice: toInput(item.itmDefPharmPrice),
    itmDefTax: toInput(item.itmDefTax),
    itmHasExpire: item.itmHasExpire ?? false,
    itmIsmedicine: item.itmIsmedicine,
    itmActive: item.itmActive,
    itmStopSell: item.itmStopSell,
    itmSrvc: item.itmSrvc,
    itmStopPur: item.itmStopPur,
    itmPrintBarcode: item.itmPrintBarcode,
    itmAllowDiscount: item.itmAllowDiscount,
    itmFreez: item.itmFreez,
    comId: toInput(item.comId),
    itmOrigin: toInput(item.itmOrigin),
    itmGroup: toInput(item.itmGroup),
    itemForm: toInput(item.itemForm),
    itmNotes: toInput(item.itmNotes),
    itmMaxDiscPer: toInput(item.itmMaxDiscPer),
    itmMaxDiscVal: toInput(item.itmMaxDiscVal),
    itmUnit1: toInput(item.itmUnit1),
    itmUnit2: toInput(item.itmUnit2),
    itmUnit3: toInput(item.itmUnit3),
    itmUnit1Unit2: toInput(item.itmUnit1Unit2),
    itmUnit1Unit3: toInput(item.itmUnit1Unit3),
    itmComCode: toInput(child?.itmComCode),
    itmLocation: toInput(child?.itmLocation),
    itmRequestLimit: toInput(child?.itmRequestLimit),
    itmMaxLimit: toInput(child?.itmMaxLimit),
    itmMinLimit: toInput(child?.itmMinLimit),
    itmDefaultLimit: toInput(child?.itmDefaultLimit),
    itmPurchaseUnit: toInput(child?.itmPurchaseUnit),
    itmSellUnit: toInput(child?.itmSellUnit),
    itmScientificN1: toInput(child?.itmScientificN1),
    itmScientificN2: toInput(child?.itmScientificN2),
    itmG1: toInput(child?.itmG1),
    itmG2: toInput(child?.itmG2),
    itmG3: toInput(child?.itmG3),
    itmScientificGroupId: toInput(child?.itmScientificGroupId),
    itmUsageMannerId: toInput(child?.itmUsageMannerId),
    itmIsShortage: toInput(child?.itmIsShortage),
    itmMidUnitDif: toInput(child?.itmMidUnitDif),
    itmSmallUnitDif: toInput(child?.itmSmallUnitDif),
    itmFracQty: toInput(child?.itmFracQty),
    itmFavourite: toInput(child?.itmFavourite),
    ucpCode: toInput(child?.ucpCode),
    itmSalesDisc: toInput(child?.itmSalesDisc),
    itmNopurreturn: toInput(child?.itmNopurreturn),
    itmSellNostock: toInput(child?.itmSellNostock),
    itmGId: toInput(child?.itmGId),
  };
}

function parseUnitCode(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formValuesToUpsertRequest(
  values: ItemCatalogFormValues
): ItemCatalogUpsertRequest {
  const hasChildData =
    values.itmComCode.trim() ||
    values.itmLocation.trim() ||
    values.itmRequestLimit.trim() ||
    values.itmMaxLimit.trim() ||
    values.itmMinLimit.trim() ||
    values.itmDefaultLimit.trim() ||
    values.itmPurchaseUnit.trim() ||
    values.itmSellUnit.trim() ||
    values.itmScientificN1.trim() ||
    values.itmScientificN2.trim() ||
    values.itmG1.trim() ||
    values.itmG2.trim() ||
    values.itmG3.trim() ||
    values.itmScientificGroupId.trim() ||
    values.itmUsageMannerId.trim() ||
    values.itmIsShortage.trim() ||
    values.itmMidUnitDif.trim() ||
    values.itmSmallUnitDif.trim() ||
    values.itmFracQty.trim() ||
    values.itmFavourite.trim() ||
    values.ucpCode.trim() ||
    values.itmSalesDisc.trim() ||
    values.itmNopurreturn.trim() ||
    values.itmSellNostock.trim() ||
    values.itmGId.trim();

  return {
    catalog: {
      itmCode: values.itmCode.trim() || null,
      itmCode2: values.itmCode2.trim() || null,
      itmIntCode: values.itmIntCode.trim() || null,
      itmNameAr: values.itmNameAr.trim() || null,
      itmNameEn: values.itmNameEn.trim() || null,
      itmDefSellPrice: parseOptionalFloat(values.itmDefSellPrice),
      itmDefTax: parseOptionalFloat(values.itmDefTax),
      itmDefPharmPrice: parseOptionalFloat(values.itmDefPharmPrice),
      itmHasExpire: values.itmHasExpire,
      itmIsmedicine: values.itmIsmedicine,
      itmActive: values.itmActive,
      itmStopSell: values.itmStopSell,
      itmSrvc: values.itmSrvc,
      itmStopPur: values.itmStopPur,
      itmPrintBarcode: values.itmPrintBarcode,
      itmAllowDiscount: values.itmAllowDiscount,
      itmFreez: values.itmFreez,
      comId: parseOptionalInt(values.comId),
      itmOrigin: parseOptionalShort(values.itmOrigin),
      itmGroup: parseOptionalInt(values.itmGroup),
      itemForm: parseOptionalInt(values.itemForm),
      itmNotes: values.itmNotes.trim() || null,
      itmMaxDiscPer: parseOptionalFloat(values.itmMaxDiscPer),
      itmMaxDiscVal: parseOptionalFloat(values.itmMaxDiscVal),
      itmUnit1: parseUnitCode(values.itmUnit1),
      itmUnit2: parseUnitCode(values.itmUnit2),
      itmUnit3: parseUnitCode(values.itmUnit3),
      itmUnit1Unit2: parseOptionalFloat(values.itmUnit1Unit2),
      itmUnit1Unit3: parseOptionalFloat(values.itmUnit1Unit3),
    },
    child: hasChildData
      ? {
          itmComCode: values.itmComCode.trim() || null,
          itmLocation: values.itmLocation.trim() || null,
          itmRequestLimit: parseOptionalFloat(values.itmRequestLimit),
          itmMaxLimit: parseOptionalFloat(values.itmMaxLimit),
          itmMinLimit: parseOptionalFloat(values.itmMinLimit),
          itmDefaultLimit: parseOptionalFloat(values.itmDefaultLimit),
          itmPurchaseUnit: parseUnitCode(values.itmPurchaseUnit),
          itmSellUnit: parseUnitCode(values.itmSellUnit),
          itmScientificN1: values.itmScientificN1.trim() || null,
          itmScientificN2: values.itmScientificN2.trim() || null,
          itmG1: parseOptionalFloat(values.itmG1),
          itmG2: parseOptionalFloat(values.itmG2),
          itmG3: parseOptionalFloat(values.itmG3),
          itmScientificGroupId: parseOptionalFloat(values.itmScientificGroupId),
          itmUsageMannerId: parseOptionalFloat(values.itmUsageMannerId),
          itmIsShortage: parseOptionalInt(values.itmIsShortage),
          itmMidUnitDif: parseOptionalFloat(values.itmMidUnitDif),
          itmSmallUnitDif: parseOptionalFloat(values.itmSmallUnitDif),
          itmFracQty: parseOptionalInt(values.itmFracQty),
          itmFavourite: parseOptionalInt(values.itmFavourite),
          ucpCode: values.ucpCode.trim() || null,
          itmSalesDisc: parseOptionalFloat(values.itmSalesDisc),
          itmNopurreturn: parseOptionalInt(values.itmNopurreturn),
          itmSellNostock: parseOptionalInt(values.itmSellNostock),
          itmGId: parseOptionalInt(values.itmGId),
        }
      : null,
  };
}
