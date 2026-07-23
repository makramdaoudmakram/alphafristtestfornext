export interface ItemOriginItem {
  ioId: number;
  ioTextAr: string;
}

export interface CreateItemOriginRequest {
  ioTextAr: string;
}

export type UpdateItemOriginRequest = CreateItemOriginRequest;
