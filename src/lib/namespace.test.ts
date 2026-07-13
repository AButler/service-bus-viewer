import { describe, it, expect } from "vitest";
import { deriveNamespaceHost } from "./namespace";

describe("deriveNamespaceHost", () => {
  it("strips the default https port", () => {
    expect(
      deriveNamespaceHost("https://contoso-prod.servicebus.windows.net:443/"),
    ).toBe("contoso-prod.servicebus.windows.net");
  });

  it("keeps a non-standard https port", () => {
    expect(deriveNamespaceHost("https://host.example.com:8080/")).toBe(
      "host.example.com:8080",
    );
  });

  it("appends the port for non-http(s) schemes", () => {
    expect(deriveNamespaceHost("amqps://host.example.com:5671/")).toBe(
      "host.example.com:5671",
    );
  });

  it("falls back to the raw value when the endpoint is not a URL", () => {
    expect(deriveNamespaceHost("not-a-url")).toBe("not-a-url");
  });
});
