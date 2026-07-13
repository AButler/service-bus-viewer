import { describe, it, expect } from "vitest";
import type { ServiceBusReceivedMessage } from "../../api/types";
import { bodyBytes, bodyToText, getRawPropertyValue } from "./properties";

const message: ServiceBusReceivedMessage = {
  messageId: "abc-1",
  sequenceNumber: 49000,
  enqueuedSequenceNumber: 49000,
  subject: "OrderCreated",
  body: { orderId: "ORD-1", total: 9.99 },
  contentType: "application/json",
  correlationId: "corr-1",
  enqueuedTimeUtc: new Date("2026-07-13T00:00:00Z"),
  expiresAtUtc: new Date("2026-07-27T00:00:00Z"),
  timeToLive: 14 * 86_400_000,
  deliveryCount: 0,
  state: "active",
};

describe("bodyBytes / bodyToText", () => {
  it("measures the serialized body length", () => {
    expect(bodyBytes(message.body)).toBe(JSON.stringify(message.body).length);
    expect(bodyBytes(undefined)).toBe(2); // JSON.stringify("") === '""'
  });

  it("pretty-prints objects and passes strings through", () => {
    expect(bodyToText("hello")).toBe("hello");
    expect(bodyToText(message.body)).toBe(
      JSON.stringify(message.body, null, 2),
    );
  });
});

describe("getRawPropertyValue", () => {
  it("derives size from the body", () => {
    expect(getRawPropertyValue(message, "size")).toBe(bodyBytes(message.body));
  });

  it("reads direct message properties by name", () => {
    expect(getRawPropertyValue(message, "messageId")).toBe("abc-1");
    expect(getRawPropertyValue(message, "sequenceNumber")).toBe(49000);
    expect(getRawPropertyValue(message, "sessionId")).toBeUndefined();
  });
});
