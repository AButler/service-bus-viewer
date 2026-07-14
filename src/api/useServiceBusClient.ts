// Factory that resolves the right Service Bus client for a connection, plus the
// connection-derived namespace listing.

import { isTauri } from "@tauri-apps/api/core";
import type { NamespaceConnection } from "../lib/connectionStore";
import type { SBNamespace, ServiceBusApi } from "./types";
import {
  MockServiceBusClient,
  namespaceResourceId,
  sampleFor,
} from "./mockServiceBusClient";
import { ServiceBusClient } from "./serviceBusClient";

/**
 * Return the client for a connection: the real Azure client in the Tauri desktop
 * build, otherwise the mock (the browser can't reach Service Bus — CORS). A
 * non-SAS (Entra) connection still gets the real client, which throws when a
 * list/peek call is made.
 */
export function useServiceBusClient(
  connection: NamespaceConnection,
): ServiceBusApi {
  return isTauri()
    ? new ServiceBusClient(connection)
    : new MockServiceBusClient(connection);
}

// --- Namespaces (derived from the user's configured connections) -------------

export async function listNamespaces(
  connections: NamespaceConnection[],
): Promise<SBNamespace[]> {
  return connections.map((connection) => ({
    id: namespaceResourceId(connection.friendlyName),
    name: connection.friendlyName,
    type: "Microsoft.ServiceBus/Namespaces",
    location: sampleFor(connection.friendlyName).location,
    properties: {
      provisioningState: "Succeeded",
      status: "Active",
      serviceBusEndpoint: connection.serviceBusEndpoint,
      createdAt: "2026-01-04T09:12:33Z",
    },
  }));
}
