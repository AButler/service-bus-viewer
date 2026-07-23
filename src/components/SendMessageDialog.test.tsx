import { describe, it, expect } from "vitest";
import {
  buildSendableMessage,
  type SendMessageFields,
} from "./SendMessageDialog";

const base: SendMessageFields = {
  body: "",
  contentType: "",
  subject: "",
  messageId: "",
  correlationId: "",
  sessionId: "",
  partitionKey: "",
  timeToLiveSeconds: "",
  scheduledEnqueueTime: "",
  properties: [],
};

describe("buildSendableMessage", () => {
  it("keeps the body and omits empty optional fields", () => {
    const message = buildSendableMessage({ ...base, body: "hello" });
    expect(message.body).toBe("hello");
    expect(message.contentType).toBeUndefined();
    expect(message.subject).toBeUndefined();
    expect(message.timeToLive).toBeUndefined();
    expect(message.scheduledEnqueueTimeUtc).toBeUndefined();
    expect(message.applicationProperties).toBeUndefined();
  });

  it("trims string fields", () => {
    const message = buildSendableMessage({
      ...base,
      contentType: " application/json ",
      subject: " order ",
      messageId: " m-1 ",
    });
    expect(message.contentType).toBe("application/json");
    expect(message.subject).toBe("order");
    expect(message.messageId).toBe("m-1");
  });

  it("converts time to live from seconds to milliseconds", () => {
    expect(
      buildSendableMessage({ ...base, timeToLiveSeconds: "60" }).timeToLive,
    ).toBe(60000);
  });

  it("ignores a non-positive or invalid time to live", () => {
    expect(
      buildSendableMessage({ ...base, timeToLiveSeconds: "0" }).timeToLive,
    ).toBeUndefined();
    expect(
      buildSendableMessage({ ...base, timeToLiveSeconds: "abc" }).timeToLive,
    ).toBeUndefined();
  });

  it("parses a scheduled enqueue time", () => {
    const message = buildSendableMessage({
      ...base,
      scheduledEnqueueTime: "2026-07-19T14:30",
    });
    expect(message.scheduledEnqueueTimeUtc).toBeInstanceOf(Date);
    expect(Number.isNaN(message.scheduledEnqueueTimeUtc!.getTime())).toBe(
      false,
    );
  });

  it("builds application properties from non-empty keys only", () => {
    const message = buildSendableMessage({
      ...base,
      properties: [
        { key: "priority", value: "high" },
        { key: " ", value: "ignored" },
        { key: "empty-value", value: "" },
      ],
    });
    expect(message.applicationProperties).toEqual({
      priority: "high",
      "empty-value": "",
    });
  });
});
