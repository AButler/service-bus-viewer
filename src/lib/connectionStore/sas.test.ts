import { describe, it, expect } from "vitest";
import { parseSasConnectionString } from "./sas";

describe("parseSasConnectionString", () => {
  it("parses a full connection string", () => {
    expect(
      parseSasConnectionString(
        "Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=Root;SharedAccessKey=abc123=",
      ),
    ).toEqual({
      serviceBusEndpoint: "sb://ns.servicebus.windows.net/",
      keyName: "Root",
      key: "abc123=",
    });
  });

  it("is tolerant of spacing and case", () => {
    expect(
      parseSasConnectionString(
        " endpoint=sb://ns/ ; sharedaccesskeyname=K ; sharedaccesskey=xyz ",
      ),
    ).toEqual({
      serviceBusEndpoint: "sb://ns/",
      keyName: "K",
      key: "xyz",
    });
  });

  it("returns null when required parts are missing", () => {
    expect(parseSasConnectionString("Endpoint=sb://ns/")).toBeNull();
    expect(parseSasConnectionString("not a connection string")).toBeNull();
  });
});
