import type { ExcelEntityMetadata, ExcelImportMode, ExcelPropertyMetadata } from "@/types/excel";

export function compareColumnNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "accent" });
}

export function toFriendlyPropertyName(propertyName: string): string {
  return propertyName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

export function getImportableProperties(
  metadata: ExcelEntityMetadata
): ExcelPropertyMetadata[] {
  return metadata.properties.filter((property) => property.isImportable);
}

export function shouldHidePrimaryKeyOnInsert(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): boolean {
  return mode === "Insert" && metadata.identityKey;
}

export function isPrimaryKeyLocked(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): boolean {
  return mode === "Update" || mode === "Upsert" || mode === "Delete";
}

export function isDeleteMode(mode: ExcelImportMode): boolean {
  return mode === "Delete";
}

export function getVisibleImportableProperties(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): ExcelPropertyMetadata[] {
  const importable = getImportableProperties(metadata);

  if (isDeleteMode(mode)) {
    return importable.filter((property) => property.isPrimaryKey);
  }

  if (shouldHidePrimaryKeyOnInsert(metadata, mode)) {
    return importable.filter((property) => !property.isPrimaryKey);
  }

  return importable;
}

export function findProperty(
  metadata: ExcelEntityMetadata,
  columnName: string
): ExcelPropertyMetadata | undefined {
  return metadata.properties.find(
    (property) => compareColumnNames(property.name, columnName) === 0
  );
}

export function isColumnRemovable(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  columnName: string
): boolean {
  if (isDeleteMode(mode)) return false;

  const property = findProperty(metadata, columnName);
  if (!property) return false;

  if (property.isPrimaryKey && isPrimaryKeyLocked(metadata, mode)) {
    return false;
  }

  if (
    property.isRequired &&
    !property.isPrimaryKey &&
    !property.isDatabaseGenerated
  ) {
    return false;
  }

  return true;
}

export function isColumnLocked(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  columnName: string
): boolean {
  return !isColumnRemovable(metadata, mode, columnName);
}

export function buildDefaultSelectedColumns(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): string[] {
  const visible = getVisibleImportableProperties(metadata, mode);

  if (isDeleteMode(mode)) {
    return visible
      .filter((property) => property.isPrimaryKey)
      .map((property) => property.name);
  }

  const names = visible.map((property) => property.name);

  if (
    (mode === "Update" || mode === "Upsert") &&
    !names.some((name) => compareColumnNames(name, metadata.primaryKey) === 0)
  ) {
    const primaryKeyProperty = findProperty(metadata, metadata.primaryKey);
    if (primaryKeyProperty) {
      return [metadata.primaryKey, ...names];
    }
  }

  return names;
}

export function buildAvailableColumns(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  selectedColumns: string[]
): string[] {
  const selectedSet = new Set(selectedColumns.map((name) => name.toLowerCase()));

  return getVisibleImportableProperties(metadata, mode)
    .map((property) => property.name)
    .filter((name) => !selectedSet.has(name.toLowerCase()))
    .sort(compareColumnNames);
}

export function buildDefaultTemplateName(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): string {
  return `${metadata.displayName} ${mode} Export`;
}

/** Reserved for a future saved-template feature. */
export type ExcelExportTemplateProfile = {
  id: string;
  name: string;
  entityName: string;
  mode: ExcelImportMode;
  selectedColumns: string[];
  updatedAt?: string;
};
