export type ItemCatalogChildItem = {

  itemCChId: number;

  itemCatalogId: number;

  itmLocation: string | null;

  itmRequestLimit: number | null;

  itmMaxLimit: number | null;

  itmMinLimit: number | null;

  itmDefaultLimit: number | null;

  itmPurchaseUnit: number | null;

  itmSellUnit: number | null;

  itmScientificN1: string | null;

  itmScientificN2: string | null;

  itmG1: number | null;

  itmG2: number | null;

  itmG3: number | null;

  itmScientificGroupId: number | null;

  itmUsageMannerId: number | null;

  itmIsShortage: number | null;

  itmMidUnitDif: number | null;

  itmSmallUnitDif: number | null;

  itmFracQty: number | null;

  itmFavourite: number | null;

  ucpCode: string | null;

  itmSalesDisc: number | null;

  itmNopurreturn: number | null;

  itmSellNostock: number | null;

  itmGId: number | null;

};



export type ItemCatalogItem = {

  id: number;

  itemCatalogId: number;

  itmCode: string | null;

  itmCode2: string | null;

  itmIntCode: string | null;

  itmNameAr: string | null;

  itmNameEn: string | null;

  itmDefSellPrice: number | null;

  itmDefTax: number | null;

  itmDefPharmPrice: number | null;

  itmHasExpire: boolean | null;

  itmActive: boolean;

  itmStopSell: boolean;

  itmSrvc: boolean;

  itmStopPur: boolean;

  itmPrintBarcode: boolean;

  itmAllowDiscount: boolean;

  itmFreez: boolean;

  stopTransfer: boolean;

  brandId: number | null;

  brandName: string | null;

  itmGroup: number | null;

  groupName: string | null;

  itemForm: number | null;

  itemFormName: string | null;

  itmOrigin: number | null;

  itemOriginName: string | null;

  itmNotes: string | null;

  itmMaxDiscPer: number | null;

  itmMaxDiscVal: number | null;

  itmUnit1: number | null;

  itmUnit2: number | null;

  itmUnit3: number | null;

  itmUnit1Unit2: number | null;

  itmUnit1Unit3: number | null;

  child: ItemCatalogChildItem | null;

};



export type ItemCatalogUpsertRequest = {

  catalog: {

    itmCode: string | null;

    itmCode2: string | null;

    itmIntCode: string | null;

    itmNameAr: string | null;

    itmNameEn: string | null;

    itmDefSellPrice: number | null;

    itmDefTax: number | null;

    itmDefPharmPrice: number | null;

    itmHasExpire: boolean | null;

    itmActive: boolean;

    itmStopSell: boolean;

    itmSrvc: boolean;

    itmStopPur: boolean;

    itmPrintBarcode: boolean;

    itmAllowDiscount: boolean;

    itmFreez: boolean;

    stopTransfer: boolean;

    brandId: number | null;

    itmGroup: number | null;

    itemForm: number | null;

    itmOrigin: number | null;

    itmNotes: string | null;

    itmMaxDiscPer: number | null;

    itmMaxDiscVal: number | null;

    itmUnit1: number | null;

    itmUnit2: number | null;

    itmUnit3: number | null;

    itmUnit1Unit2: number | null;

    itmUnit1Unit3: number | null;

  };

  child: {

    itmLocation: string | null;

    itmRequestLimit: number | null;

    itmMaxLimit: number | null;

    itmMinLimit: number | null;

    itmDefaultLimit: number | null;

    itmPurchaseUnit: number | null;

    itmSellUnit: number | null;

    itmScientificN1: string | null;

    itmScientificN2: string | null;

    itmG1: number | null;

    itmG2: number | null;

    itmG3: number | null;

    itmScientificGroupId: number | null;

    itmUsageMannerId: number | null;

    itmIsShortage: number | null;

    itmMidUnitDif: number | null;

    itmSmallUnitDif: number | null;

    itmFracQty: number | null;

    itmFavourite: number | null;

    ucpCode: string | null;

    itmSalesDisc: number | null;

    itmNopurreturn: number | null;

    itmSellNostock: number | null;

    itmGId: number | null;

  } | null;

};



export type ItemCatalogPagedResult = {

  items: ItemCatalogItem[];

  totalCount: number;

  page: number;

  pageSize: number;

};



export type ItemCatalogPageQuery = {

  page: number;

  pageSize: number;

  sortBy?: string;

  sortDesc?: boolean;

  search?: string;

};


