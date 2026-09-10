import type {
  PharmTransferDetail,
  PharmTransferDocument,
  PharmTransferHeader,
  PharmTransferSearchFilters,
} from "@/types/pharm-transfer";
import {
  EMPLOY_TYPE_DELIVERY,
  EMPLOY_TYPE_RECEIVING,
} from "@/types/pharm-transfer";
import {
  createPharmTransferRepository,
  PharmTransferRepositoryError,
} from "@/repository/pharm-transfer.repository";
import { computePharmTransferTotals } from "@/lib/pharm-transfer-calculations";

export function createEmptyDetailRow(): PharmTransferDetail {
  return {
    clientRowId: crypto.randomUUID(),
    itmId: "",
    qnty: 0,
    unitId: 0,
    itmSell: 0,
    purchPrice: 0,
    batchNo: "",
    expDate: "",
    stockId: null,
    baseItmSell: 0,
    baseCostPrice: 0,
    priceQtyNet: 1,
  };
}

/** Empty / whitespace / "0" / non-positive numeric codes are invalid. */
export function isMissingOrZeroCode(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === "0") return true;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric <= 0) return true;
  return false;
}

export function emptyPharmTransferHeader(): PharmTransferHeader {
  const today = new Date();
  const traDate = today.toISOString().slice(0, 10);
  return {
    movDis: 0,
    traDate,
    deliveryEmployeeCode: "",
    receivingEmployeePassword: "",
    receivingEmployeeCode: "",
    note: "",
    traTotalCost: 0,
  };
}

export function filterDetailsWithItemCode(
  details: PharmTransferDetail[]
): PharmTransferDetail[] {
  return details.filter((row) => row.itmId.trim().length > 0);
}

export function computeDeletedDetailIds(
  initialIds: number[],
  currentDetails: PharmTransferDetail[]
): number[] {
  const currentIds = new Set(
    currentDetails
      .map((row) => row.id)
      .filter((id): id is number => id != null && id > 0)
  );
  return initialIds.filter((id) => !currentIds.has(id));
}

export function toUpsertPayload(
  header: PharmTransferHeader,
  details: PharmTransferDetail[],
  deletedDetailIds?: number[]
) {
  return {
    header: {
      id: header.id,
      movDis: header.movDis,
      traDate: header.traDate,
      deliveryEmployeeCode: header.deliveryEmployeeCode.trim(),
      receivingEmployeeCode: header.receivingEmployeeCode.trim(),
      receivingEmployeePassword: header.receivingEmployeePassword?.trim() || null,
      note: header.note?.trim() || null,
    },
    details: details.map((row) => ({
      id: row.id,
      itemCode: row.itmId.trim(),
      itemCatalogId: row.itemCatalogId,
      quantity: row.qnty,
      unitId: row.unitId,
      salesPrice: row.itmSell,
      batchNo: row.batchNo?.trim() || null,
      expDate: row.expDate?.trim() || null,
      stockId: row.stockId ?? null,
    })),
    deletedDetailIds: deletedDetailIds ?? [],
  };
}

export function documentToFormValues(document: PharmTransferDocument) {
  return {
    header: {
      ...document.header,
      receivingEmployeePassword: "",
    },
    details: document.details.length ? document.details : [createEmptyDetailRow()],
  };
}

export { computePharmTransferTotals };

export class PharmTransferService {
  private repository: ReturnType<typeof createPharmTransferRepository>;

  constructor(token: string) {
    this.repository = createPharmTransferRepository(token);
  }

  getContext() {
    return this.repository.getContext();
  }

  search(filters: PharmTransferSearchFilters) {
    return this.repository.search({
      itemCode: filters.itemCode,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  }

  loadById(id: number) {
    return this.repository.getById(id);
  }

  lookupEmployee(code: string, employType: number) {
    return this.repository.lookupEmployee(code, employType);
  }

  lookupEmployeeByPassword(password: string) {
    return this.repository.lookupEmployeeByPassword(password);
  }

  async resolveEmployeeLookups(
    header: PharmTransferHeader
  ): Promise<{ header: PharmTransferHeader; error: string | null }> {
    const receivingPassword = header.receivingEmployeePassword?.trim() ?? "";
    const receivingCode = header.receivingEmployeeCode.trim();

    if (isMissingOrZeroCode(receivingPassword) && isMissingOrZeroCode(receivingCode)) {
      return {
        header,
        error: "Employee code is required and must be a valid employee.",
      };
    }

    let receivingEmployee = null;
    if (!isMissingOrZeroCode(receivingPassword)) {
      receivingEmployee = await this.lookupEmployeeByPassword(receivingPassword);
      if (!receivingEmployee) {
        return {
          header,
          error: "Employee code is required and must be a valid employee.",
        };
      }
    } else {
      receivingEmployee = await this.lookupEmployee(
        receivingCode,
        EMPLOY_TYPE_RECEIVING
      );
      if (!receivingEmployee) {
        return {
          header,
          error: "Employee code is required and must be a valid employee.",
        };
      }
    }

    if (isMissingOrZeroCode(receivingEmployee.code)) {
      return {
        header,
        error: "Employee code is required and must be a valid employee.",
      };
    }

    const deliveryCode = header.deliveryEmployeeCode.trim();
    if (isMissingOrZeroCode(deliveryCode)) {
      return {
        header,
        error: "Delivery code is required and must be a valid delivery.",
      };
    }

    const deliveryEmployee = await this.lookupEmployee(
      deliveryCode,
      EMPLOY_TYPE_DELIVERY
    );
    if (!deliveryEmployee) {
      return {
        header,
        error: "Delivery code is required and must be a valid delivery.",
      };
    }

    return {
      header: {
        ...header,
        deliveryEmployeeCode: deliveryCode,
        deliveryEmployeeName: deliveryEmployee.name,
        receivingEmployeeCode: receivingEmployee.code?.trim() ?? receivingCode,
        receivingEmployeeName: receivingEmployee.name,
      },
      error: null,
    };
  }

  validateBeforeSave(header: PharmTransferHeader, details: PharmTransferDetail[]) {
    if (!header.movDis || header.movDis <= 0) {
      return "Please select a destination pharmacy.";
    }

    const receivingPassword = header.receivingEmployeePassword?.trim() ?? "";
    const receivingCode = header.receivingEmployeeCode.trim();
    if (isMissingOrZeroCode(receivingPassword) && isMissingOrZeroCode(receivingCode)) {
      return "Employee code is required.";
    }

    if (isMissingOrZeroCode(header.deliveryEmployeeCode)) {
      return "Delivery code is required.";
    }

    const lines = filterDetailsWithItemCode(details);
    if (lines.length === 0) {
      return "Please add at least one item.";
    }

    for (const row of lines) {
      if (!row.unitId || row.unitId <= 0) {
        return "Each detail line requires a unit.";
      }
      if (!row.qnty || row.qnty <= 0) {
        return "Quantity must be greater than zero.";
      }
      if (!row.batchNo?.trim()) {
        return `Item "${row.itmId}" requires a stock batch.`;
      }
      if (
        row.purchPrice == null ||
        !Number.isFinite(row.purchPrice) ||
        row.purchPrice <= 0
      ) {
        return `Item "${row.itmId}" is missing a stock cost price.`;
      }
      if (row.itmSell == null || row.itmSell < 0 || Number.isNaN(row.itmSell)) {
        return "Sales price is invalid.";
      }
    }

    return null;
  }

  async save(input: {
    header: PharmTransferHeader;
    details: PharmTransferDetail[];
    recordId?: number | null;
    deletedDetailIds?: number[];
  }): Promise<PharmTransferDocument> {
    const validationError = this.validateBeforeSave(input.header, input.details);
    if (validationError) {
      throw new PharmTransferRepositoryError(validationError, 400);
    }

    const { header: resolvedHeader, error: employeeError } =
      await this.resolveEmployeeLookups(input.header);
    if (employeeError) {
      throw new PharmTransferRepositoryError(employeeError, 400);
    }

    const payload = toUpsertPayload(
      resolvedHeader,
      filterDetailsWithItemCode(input.details),
      input.deletedDetailIds
    );

    const recordId = input.recordId ?? input.header.id;
    if (recordId != null && recordId > 0) {
      return this.repository.update(recordId, payload);
    }
    return this.repository.create(payload);
  }

  remove(id: number) {
    return this.repository.delete(id);
  }
}

export function createPharmTransferService(token: string) {
  return new PharmTransferService(token);
}

export { PharmTransferRepositoryError };
