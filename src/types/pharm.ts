export interface PharmItem {
  parmId: number;
  parmArName: string;
  parmEnName: string;
  parmTel: string;
  parmAdress: string;
  parmStor: string;
  parmBussReg: string;
  parmTaxNo: string;
  parmOwnerName: string;
  parmOwnerAdress: string;
  parmOwnerMob: string;
  parmOwnerTel: string;
  parmOwnerEMail: string;
  parmMangerName: string;
  parmMangerAdress: string;
  parmMangerTel: string;
  parmMangerMob: string;
  parmOrder: number;
}

export type PharmFormValues = {
  parmArName: string;
  parmEnName: string;
  parmTel: string;
  parmAdress: string;
  parmStor: string;
  parmBussReg: string;
  parmTaxNo: string;
  parmOwnerName: string;
  parmOwnerAdress: string;
  parmOwnerMob: string;
  parmOwnerTel: string;
  parmOwnerEMail: string;
  parmMangerName: string;
  parmMangerAdress: string;
  parmMangerTel: string;
  parmMangerMob: string;
  parmOrder: string;
};

export const emptyPharmFormValues: PharmFormValues = {
  parmArName: "",
  parmEnName: "",
  parmTel: "",
  parmAdress: "",
  parmStor: "",
  parmBussReg: "",
  parmTaxNo: "",
  parmOwnerName: "",
  parmOwnerAdress: "",
  parmOwnerMob: "",
  parmOwnerTel: "",
  parmOwnerEMail: "",
  parmMangerName: "",
  parmMangerAdress: "",
  parmMangerTel: "",
  parmMangerMob: "",
  parmOrder: "0",
};

export type UpdatePharmRequest = Omit<PharmFormValues, "parmOrder"> & {
  parmOrder: number;
};
