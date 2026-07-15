import { describe, it, expect, beforeEach } from "vitest";
import { getConnectionStore } from "./index";

const store = getConnectionStore();

describe("browser connection store", () => {
  beforeEach(async () => {
    // setup.ts resets IndexedDB before each test, so the store starts empty.
    expect(await store.list()).toEqual([]);
  });

  it("adds a SAS connection and round-trips the secret", async () => {
    const created = await store.add({
      friendlyName: "prod",
      serviceBusEndpoint: "sb://prod.servicebus.windows.net/",
      auth: { kind: "sas", keyName: "Root", key: "super-secret" },
    });
    expect(created.id).toBeTruthy();

    const [loaded] = await store.list();
    expect(loaded).toMatchObject({
      friendlyName: "prod",
      auth: { kind: "sas", keyName: "Root", key: "super-secret" },
    });
  });

  it("stores an Entra connection with an optional refresh token", async () => {
    await store.add({
      friendlyName: "corp",
      serviceBusEndpoint: "sb://corp.servicebus.windows.net/",
      auth: { kind: "entra", tenantId: "t-1" },
    });
    const [loaded] = await store.list();
    expect(loaded.auth).toEqual({
      kind: "entra",
      tenantId: "t-1",
      refreshToken: undefined,
    });
  });

  it("updates and removes connections", async () => {
    const created = await store.add({
      friendlyName: "prod",
      serviceBusEndpoint: "sb://prod.servicebus.windows.net/",
      auth: { kind: "sas", keyName: "Root", key: "k" },
    });

    await store.update({
      ...created,
      friendlyName: "prod-renamed",
      auth: { kind: "sas", keyName: "Root", key: "k2" },
    });
    let list = await store.list();
    expect(list[0].friendlyName).toBe("prod-renamed");
    expect(list[0].auth).toMatchObject({ key: "k2" });

    await store.remove(created.id);
    list = await store.list();
    expect(list).toEqual([]);
  });

  it("does not persist the secret in cleartext", async () => {
    await store.add({
      friendlyName: "prod",
      serviceBusEndpoint: "sb://prod.servicebus.windows.net/",
      auth: { kind: "sas", keyName: "Root", key: "super-secret" },
    });
    const raw = JSON.stringify(await dumpRaw());
    expect(raw).not.toContain("super-secret");
  });
});

// Read the underlying stored value directly to assert secrets are encrypted.
async function dumpRaw(): Promise<unknown> {
  const { idbGet } = await import("./idb");
  return idbGet("connections");
}
