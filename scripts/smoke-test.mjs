import "dotenv/config";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path}: ${response.status} ${text}`);
  }
  return body;
}

const login = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
});
const auth = { authorization: `Bearer ${login.accessToken}` };
const suffix = Date.now().toString(36);
const customer = await request("/auth/register", {
  method: "POST",
  body: JSON.stringify({
    email: `client-${suffix}@example.com`,
    displayName: "Client Test",
    password: "mot-de-passe-client-solide",
  }),
});
const customerAuth = { authorization: `Bearer ${customer.accessToken}` };

await request("/health/ready");
const category = await request("/admin/catalog/categories", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ name: `Test ${suffix}`, slug: `test-${suffix}` }),
});
const product = await request("/admin/catalog/products", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    categoryId: category.id,
    name: `Plat ${suffix}`,
    slug: `plat-${suffix}`,
    price: 2500,
    status: "ACTIVE",
  }),
});
const order = await request("/orders", {
  method: "POST",
  headers: {
    ...customerAuth,
    "idempotency-key": `smoke-${suffix}-unique-key`,
  },
  body: JSON.stringify({
    customerName: "Client Test",
    customerPhone: "+237699000000",
    fulfillmentType: "PICKUP",
    paymentMethod: "CASH",
    items: [{ productId: product.id, quantity: 2 }],
  }),
});
await request(`/orders/${order.reference}/status`, { headers: customerAuth });
await request("/orders/me", { headers: customerAuth });
await request(`/admin/orders/${order.id}/status`, {
  method: "PATCH",
  headers: auth,
  body: JSON.stringify({ status: "CONFIRMED" }),
});
await request(`/admin/payments/${order.payments[0].id}/confirm-cash`, {
  method: "PATCH",
  headers: auth,
  body: JSON.stringify({ note: "Test d’intégration" }),
});
await request("/admin/reports/dashboard", { headers: auth });

console.log(`Smoke test réussi : ${order.reference}`);
