export type ReportingMongoConnectionTest = {
  enabled: boolean;
  connected: boolean;
  databaseAccessible: boolean;
  databaseName: string;
  connectionString: string;
  inventoryMovementFactsCollection: string;
  inventoryMovementFactsAccessible: boolean;
  ledgerMovementFactsAccessible: boolean;
  error: string | null;
  purchaseImpact: string;
};
