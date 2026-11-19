import type { ExcelEntityMetadata, ExcelImportMode, ExcelPropertyMetadata } from "@/types/excel";

export function compareColumnNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "accent" });
}

export function toFriendlyPropertyName(propertyName: string): string {
  return propertyName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-z]+)([A-Z][a-z])/g, "$1 $2");
}

export function usesAlternateKeyForUpdate(metadata: ExcelEntityMetadata): boolean {
  return (
    metadata.updateMatchAlternateKey === true &&
    Boolean(metadata.alternateKey?.trim())
  );
}

export function getMatchKeyColumn(metadata: ExcelEntityMetadata): string {
  if (usesAlternateKeyForUpdate(metadata)) {
    return metadata.alternateKey!.trim();
  }
  return metadata.primaryKey;
}

const ITEM_CATALOG_UPDATE_HIDDEN = new Set(
  ["id", "itemcatalogid"].map((s) => s.toLowerCase())
);

export function isHiddenForUpdateTemplate(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  columnName: string
): boolean {
  if (metadata.entityName !== "ItemCatalog" || mode !== "Update") {
    return false;
  }
  if (!usesAlternateKeyForUpdate(metadata)) {
    return false;
  }
  return ITEM_CATALOG_UPDATE_HIDDEN.has(columnName.toLowerCase());
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
  if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
    return false;
  }
  return mode === "Update" || mode === "Upsert" || mode === "Delete";
}

export function isDeleteMode(mode: ExcelImportMode): boolean {
  return mode === "Delete";
}

export function isMatchKeyColumn(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  columnName: string
): boolean {
  if (isDeleteMode(mode)) {
    return compareColumnNames(columnName, metadata.primaryKey) === 0;
  }
  if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
    const matchKey = getMatchKeyColumn(metadata);
    return compareColumnNames(columnName, matchKey) === 0;
  }
  if (isPrimaryKeyLocked(metadata, mode)) {
    return compareColumnNames(columnName, metadata.primaryKey) === 0;
  }
  return false;
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

  return importable.filter(
    (property) => !isHiddenForUpdateTemplate(metadata, mode, property.name)
  );
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

  if (isMatchKeyColumn(metadata, mode, columnName)) {
    return false;
  }

  if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
    return true;
  }

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
  if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
    return [];
  }

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
  const matchKey = getMatchKeyColumn(metadata);

  return getVisibleImportableProperties(metadata, mode)
    .map((property) => property.name)
    .filter((name) => !selectedSet.has(name.toLowerCase()))
    .filter((name) => compareColumnNames(name, matchKey) !== 0)
    .filter((name) => !isHiddenForUpdateTemplate(metadata, mode, name))
    .sort(compareColumnNames);
}

export function buildDefaultTemplateName(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): string {
  return `${metadata.displayName} ${mode} Export`;
}

/** Columns always sent on the template besides user-selected optional columns. */
export function getLockedMatchKeyColumns(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode
): string[] {
  if (isDeleteMode(mode)) {
    return [metadata.primaryKey];
  }
  if (usesAlternateKeyForUpdate(metadata) && mode === "Update") {
    return [metadata.alternateKey!];
  }
  if (
    (mode === "Update" || mode === "Upsert") &&
    isPrimaryKeyLocked(metadata, mode)
  ) {
    return [metadata.primaryKey];
  }
  return [];
}

export function dedupeColumnNames(columns: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of columns) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

/** Match key first, then optional columns — each property name at most once. */
export function buildDisplaySelectedColumns(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  selectedColumns: string[]
): string[] {
  const matchKeys = getLockedMatchKeyColumns(metadata, mode);
  const locked = new Set(matchKeys.map((name) => name.toLowerCase()));
  const optional = dedupeColumnNames(selectedColumns).filter(
    (name) => !locked.has(name.toLowerCase())
  );
  return [...matchKeys, ...optional];
}

export function countOptionalSelectedColumns(
  metadata: ExcelEntityMetadata,
  mode: ExcelImportMode,
  selectedColumns: string[]
): number {
  const locked = new Set(
    getLockedMatchKeyColumns(metadata, mode).map((c) => c.toLowerCase())
  );
  return dedupeColumnNames(selectedColumns).filter(
    (name) => !locked.has(name.toLowerCase())
  ).length;
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