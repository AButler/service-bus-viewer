import { describe, it, expect } from "vitest";
import {
  buildEntityPath,
  buildMessagePath,
  parseSelectionPath,
  selectionAncestorItemIds,
} from "./selectionRoute";

describe("parseSelectionPath", () => {
  it("returns null for the root and short paths", () => {
    expect(parseSelectionPath("/")).toBeNull();
    expect(parseSelectionPath("/contoso-prod")).toBeNull();
    expect(parseSelectionPath("/contoso-prod/queues")).toBeNull();
  });

  it("returns null for an unknown entity kind", () => {
    expect(parseSelectionPath("/contoso-prod/widgets/orders")).toBeNull();
  });

  it("parses a queue with the active view", () => {
    expect(parseSelectionPath("/contoso-prod/queues/orders/messages")).toEqual({
      itemId: "queue:contoso-prod/orders",
      kind: "queue",
      namespaceName: "contoso-prod",
      entityPath: "orders",
      label: "orders",
      view: "active",
      sequenceNumber: null,
    });
  });

  it("parses a queue dead-letter view with a sequence number", () => {
    const result = parseSelectionPath(
      "/contoso-prod/queues/orders/dead-letters/49000",
    );
    expect(result).toMatchObject({
      kind: "queue",
      view: "deadletter",
      sequenceNumber: "49000",
    });
  });

  it("parses a subscription with topic/subscription label", () => {
    const result = parseSelectionPath(
      "/contoso-prod/topics/order-events/audit/messages/50",
    );
    expect(result).toEqual({
      itemId: "subscription:contoso-prod/order-events/audit",
      kind: "subscription",
      namespaceName: "contoso-prod",
      entityPath: "order-events/audit",
      label: "order-events / audit",
      view: "active",
      sequenceNumber: "50",
    });
  });

  it("ignores a message id when the view segment is missing", () => {
    const result = parseSelectionPath("/contoso-prod/queues/orders/49000");
    expect(result).toMatchObject({ view: "active", sequenceNumber: null });
  });
});

describe("buildEntityPath / buildMessagePath", () => {
  const queue = {
    kind: "queue" as const,
    namespaceName: "contoso-prod",
    entityPath: "orders",
  };
  const subscription = {
    kind: "subscription" as const,
    namespaceName: "contoso-prod",
    entityPath: "order-events/audit",
  };

  it("builds queue paths per view", () => {
    expect(buildEntityPath(queue, "active")).toBe(
      "/contoso-prod/queues/orders/messages",
    );
    expect(buildEntityPath(queue, "deadletter")).toBe(
      "/contoso-prod/queues/orders/dead-letters",
    );
  });

  it("builds subscription paths", () => {
    expect(buildEntityPath(subscription, "active")).toBe(
      "/contoso-prod/topics/order-events/audit/messages",
    );
  });

  it("appends the sequence number for message paths", () => {
    expect(buildMessagePath(queue, "active", "49000")).toBe(
      "/contoso-prod/queues/orders/messages/49000",
    );
  });

  it("round-trips through parseSelectionPath", () => {
    const path = buildMessagePath(subscription, "deadletter", "7");
    expect(parseSelectionPath(path)).toMatchObject({
      kind: "subscription",
      entityPath: "order-events/audit",
      view: "deadletter",
      sequenceNumber: "7",
    });
  });
});

describe("selectionAncestorItemIds", () => {
  it("lists the namespace and queues group for a queue", () => {
    const selection = parseSelectionPath(
      "/contoso-prod/queues/orders/messages",
    )!;
    expect(selectionAncestorItemIds(selection)).toEqual([
      "namespace:contoso-prod",
      "group:contoso-prod:queues",
    ]);
  });

  it("includes the topic branch for a subscription", () => {
    const selection = parseSelectionPath(
      "/contoso-prod/topics/order-events/audit/messages",
    )!;
    expect(selectionAncestorItemIds(selection)).toEqual([
      "namespace:contoso-prod",
      "group:contoso-prod:topics",
      "topic:contoso-prod/order-events",
    ]);
  });
});
