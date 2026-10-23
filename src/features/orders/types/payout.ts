export type SellerBalance = {
  available: number;
  pending: number;
};

export type TransferItem = {
  id: string;
  amount: number;
  nessiFeeCents: number;
  netAmount: number;
  createdAt: string;
  orderId: string | null;
};

export type PayoutHistoryResponse = {
  transfers: TransferItem[];
  hasMore: boolean;
  nextCursor: string | null;
};
