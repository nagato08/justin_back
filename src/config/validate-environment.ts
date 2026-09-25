export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const text = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;
  const nodeEnv = text(values.NODE_ENV, "development");
  const databaseUrl = text(values.DATABASE_URL);
  const jwtSecret = text(values.JWT_SECRET);

  if (!databaseUrl.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL doit être une URL PostgreSQL.");
  }
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET doit contenir au moins 32 caractères.");
  }
  if (
    nodeEnv === "production" &&
    jwtSecret.includes("development-only-secret")
  ) {
    throw new Error(
      "Le secret JWT de développement est interdit en production.",
    );
  }

  const vapidValues = [
    values.VAPID_SUBJECT,
    values.VAPID_PUBLIC_KEY,
    values.VAPID_PRIVATE_KEY,
  ];
  const configuredVapidValues = vapidValues.filter(
    (value) => typeof value === "string" && value.length > 0,
  ).length;
  if (configuredVapidValues !== 0 && configuredVapidValues !== 3) {
    throw new Error(
      "Les trois variables VAPID doivent être configurées ensemble.",
    );
  }
  const pawaBaseUrl = text(
    values.PAWAPAY_BASE_URL,
    "https://api.sandbox.pawapay.io",
  );
  if (!pawaBaseUrl.startsWith("https://")) {
    throw new Error("PAWAPAY_BASE_URL doit utiliser HTTPS.");
  }

  return values;
}
