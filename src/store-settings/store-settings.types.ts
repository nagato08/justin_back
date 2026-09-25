export interface StoreSettingsRecord {
  id: number;
  businessName: string;
  timezone: string;
  ordersOpenAt: string;
  ordersCloseAt: string;
  isManuallyClosed: boolean;
  manualClosureReason: string | null;
  nextOpeningAt: Date | null;
  allowPreorders: boolean;
  dailyOrderLimit: number | null;
  dailyPortionLimit: number | null;
  defaultDeliveryFee: { toString(): string } | number | string;
  mobileMoneyEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderingWindow {
  start: Date;
  end: Date;
}

export interface PublicStoreStatus {
  businessName: string;
  isOpen: boolean;
  reason: "OPEN" | "MANUALLY_CLOSED" | "OUTSIDE_BUSINESS_HOURS";
  message: string;
  ordersOpenAt: string;
  ordersCloseAt: string;
  timezone: string;
  allowPreorders: boolean;
  mobileMoneyEnabled: boolean;
  nextOpeningAt: string | null;
}
