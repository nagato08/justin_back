import { StoreSettingsService } from "./store-settings.service";
import { StoreSettingsRecord } from "./store-settings.types";

describe("StoreSettingsService", () => {
  const service = new StoreSettingsService({} as never);
  const settings: StoreSettingsRecord = {
    id: 1,
    businessName: "Ma cuisine",
    timezone: "Africa/Douala",
    ordersOpenAt: "18:00",
    ordersCloseAt: "09:00",
    isManuallyClosed: false,
    manualClosureReason: null,
    nextOpeningAt: null,
    allowPreorders: false,
    dailyOrderLimit: null,
    dailyPortionLimit: null,
    defaultDeliveryFee: 0,
    mobileMoneyEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("calcule la capacité sur la journée locale", () => {
    const window = service.getOrderingWindow(
      settings,
      new Date("2026-09-22T15:00:00+01:00"),
    );
    expect(window.start.toISOString()).toBe("2026-09-21T23:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-22T23:00:00.000Z");
  });

  it.each([
    ["le matin", "2026-09-22T10:00:00+01:00"],
    ["l’après-midi", "2026-09-22T15:00:00+01:00"],
    ["la nuit", "2026-09-22T23:00:00+01:00"],
  ])("laisse les commandes ouvertes %s", (_, date) => {
    expect(service.getPublicStatus(settings, new Date(date)).isOpen).toBe(true);
  });

  it("respecte uniquement la fermeture manuelle", () => {
    const status = service.getPublicStatus({
      ...settings,
      isManuallyClosed: true,
      manualClosureReason: "Toutes les portions sont réservées.",
    });
    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe("MANUALLY_CLOSED");
    expect(status.message).toBe("Toutes les portions sont réservées.");
  });
});
