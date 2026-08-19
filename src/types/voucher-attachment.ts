export type VoucherAttachmentType = "Collect" | "Payment" | "Parm";

export type VoucherAttachmentItem = {
  id: number;
  voucherType: string;
  voucherId: number;
  originalFileName: string;
  fileExtension: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string | null;
};
