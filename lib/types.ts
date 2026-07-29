// Plain client-side shapes matching what the API routes actually return over
// JSON (Prisma's Decimal/Date types serialize to string, not their native form).

export type ApiLineItem = {
  id: string;
  lineOrder: number;
  rawText: string;
  itemName: string;
  qty: string | null;
  price: string | null;
  stockRemarks: string | null;
};

export type ApiEnquiry = {
  id: string;
  gmailThreadId: string;
  senderEmail: string;
  senderName: string | null;
  companyName: string | null;
  subject: string;
  status: "NEW" | "IN_PROGRESS" | "DRAFTED" | "SENT" | "DISMISSED";
  generalRemarks: string | null;
  createdAt: string;
  lineItems: ApiLineItem[];
};

export type ApiTemplate = {
  id: string;
  openingLineHtml: string;
  termsBlockHtml: string;
  closingSignatureHtml: string;
  isHtml: boolean;
};

export type ApiDraft = {
  id: string;
  enquiryId: string;
  gmailDraftId: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isHtml: boolean;
  status: "PENDING" | "SENT" | "SUPERSEDED";
  generatedAt: string;
  generatedByUser: { name: string };
  enquiry: { companyName: string | null; senderName: string | null; subject: string };
};

export type ApiSentHistoryItem = {
  id: string;
  itemName: string;
  qty: string | null;
  price: string | null;
  stockRemarks: string | null;
};

export type ApiSentHistory = {
  id: string;
  senderEmail: string;
  companyName: string | null;
  subject: string;
  bodyText: string;
  generalRemarks: string | null;
  sentAt: string;
  sentByUser: { name: string };
  items: ApiSentHistoryItem[];
};
