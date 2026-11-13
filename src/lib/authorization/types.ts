export type AuthorizationPageContractDto = {
  pageKey: string;
  viewCapabilityCode: string | null;
  sectionKey: string;
};

export type AuthorizationRegistryContractDto = {
  policyVersion: string;
  pages: AuthorizationPageContractDto[];
};
