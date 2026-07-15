import type { ServiceBusReceivedMessage } from "../../api/types";

export const SYSTEM_PROPERTY_NAMES = [
  "messageId",
  "sequenceNumber",
  "subject",
  "correlationId",
  "contentType",
  "size",
  "deliveryCount",
  "timeToLive",
  "enqueuedTimeUtc",
  "expiresAtUtc",
] as const;

export const DEAD_LETTER_PROPERTY_NAMES = [
  "deadLetterReason",
  "deadLetterErrorDescription",
  "deadLetterSource",
] as const;

/** Display-name overrides for known raw property names. */
export const propertyLabels: Record<string, string> = {
  messageId: "Message ID",
  sequenceNumber: "Sequence Number",
  subject: "Subject",
  correlationId: "Correlation ID",
  contentType: "Content Type",
  size: "Size",
  deliveryCount: "Delivery Count",
  timeToLive: "Time To Live",
  enqueuedTimeUtc: "Enqueued Time (UTC)",
  expiresAtUtc: "Expires At (UTC)",
  deadLetterReason: "Reason",
  deadLetterErrorDescription: "Error Description",
  deadLetterSource: "Source",
};

/** Approximate the serialized size of a message body in bytes. */
export function bodyBytes(body: unknown): number {
  return JSON.stringify(body ?? "").length;
}

/** Render a message body as copyable text (pretty-printed JSON or raw string). */
export function bodyToText(body: unknown): string {
  if (typeof body === "string") return body;
  return JSON.stringify(body, null, 2);
}

/** Resolve the raw value for a property name, including the derived `size`. */
export function getRawPropertyValue(
  message: ServiceBusReceivedMessage,
  name: string,
): unknown {
  if (name === "size") return bodyBytes(message.body);
  return (message as unknown as Record<string, unknown>)[name];
}
