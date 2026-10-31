import { expect, type APIRequestContext } from "@playwright/test";

export async function create(request: APIRequestContext, collection: string, payload: Record<string, unknown>) {
  const response = await request.post(`/api/collections/${collection}`, { data: payload });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}
