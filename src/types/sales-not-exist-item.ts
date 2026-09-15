export type CreateSalesNotExistItemsRequest = {
  itemCatalogIds: number[];
  custId?: number | null;
};

export type CreateSalesNotExistItemsResponse = {
  savedCount: number;
  shId: number;
  movId: number;
  pharmId: string;
};

export type MissingSalesGridItem = {
  itemCatalogId: number;
  itmCode: string;
  itemName: string;
};
