import { describe, it, expect } from "vitest";
import { listNamespaces, listQueues, peekMessages } from "./serviceBusClient";
import type { NamespaceConnection } from "../lib/connectionStore";

const connections: NamespaceConnection[] = [
  {
    id: "1",
    friendlyName: "contoso-prod",
    serviceBusEndpoint: "sb://contoso-prod.servicebus.windows.net/",
    auth: { kind: "sas", keyName: "RootManageSharedAccessKey", key: "secret" },
  },
];

describe("listNamespaces", () => {
  it("maps configured connections to namespaces", async () => {
    const namespaces = await listNamespaces(connections);
    expect(namespaces.map((n) => n.name)).toEqual(["contoso-prod"]);
    expect(namespaces[0].properties.serviceBusEndpoint).toBe(
      "sb://contoso-prod.servicebus.windows.net/",
    );
  });

  it("returns nothing when there are no connections", async () => {
    expect(await listNamespaces([])).toEqual([]);
  });
});

describe("listQueues", () => {
  it("returns queues with their count details", async () => {
    const queues = await listQueues("contoso-prod");
    expect(queues.map((q) => q.name)).toEqual([
      "orders",
      "payments",
      "notifications",
    ]);
    const orders = queues.find((q) => q.name === "orders")!;
    expect(orders.properties.countDetails.activeMessageCount).toBe(128);
    expect(orders.properties.countDetails.deadLetterMessageCount).toBe(3);
  });
});

describe("peekMessages (active)", () => {
  it("pages against the active count", async () => {
    const page = await peekMessages({
      namespaceName: "contoso-prod",
      entityPath: "orders",
      subQueue: "main",
      skip: 0,
      top: 50,
    });
    expect(page.totalCount).toBe(128);
    expect(page.value).toHaveLength(50);
  });

  it("assigns unique, increasing sequence numbers", async () => {
    const page = await peekMessages({
      namespaceName: "contoso-prod",
      entityPath: "orders",
      subQueue: "main",
      skip: 0,
      top: 50,
    });
    const seqs = page.value.map((m) => m.sequenceNumber);
    expect(new Set(seqs).size).toBe(seqs.length);
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
    }
  });

  it("enqueues every message in the past, increasing with sequence number", async () => {
    const now = Date.now();
    const page = await peekMessages({
      namespaceName: "contoso-prod",
      entityPath: "orders",
      subQueue: "main",
      skip: 0,
      top: 50,
    });
    for (const message of page.value) {
      expect(message.enqueuedTimeUtc.getTime()).toBeLessThan(now);
    }
    for (let i = 1; i < page.value.length; i++) {
      expect(page.value[i].enqueuedTimeUtc.getTime()).toBeGreaterThan(
        page.value[i - 1].enqueuedTimeUtc.getTime(),
      );
    }
  });

  it("includes messages without a subject and some larger than 1 KB", async () => {
    const page = await peekMessages({
      namespaceName: "contoso-prod",
      entityPath: "orders",
      subQueue: "main",
      skip: 0,
      top: 50,
    });
    expect(page.value.some((m) => m.subject === undefined)).toBe(true);
    expect(page.value.some((m) => JSON.stringify(m.body).length > 1024)).toBe(
      true,
    );
  });
});

describe("peekMessages (dead-letter)", () => {
  it("pages against the dead-letter count and flags each message", async () => {
    const page = await peekMessages({
      namespaceName: "contoso-prod",
      entityPath: "orders",
      subQueue: "deadletter",
      skip: 0,
      top: 50,
    });
    expect(page.totalCount).toBe(3);
    expect(page.value).toHaveLength(3);
    expect(page.value.every((m) => Boolean(m.deadLetterReason))).toBe(true);
  });
});
