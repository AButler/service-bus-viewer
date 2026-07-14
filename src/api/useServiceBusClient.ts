// Factory that resolves the right Service Bus client for a connection, plus the
// connection-derived namespace listing.

import { isTauri } from "@tauri-apps/api/core";
import type { NamespaceConnection } from "../lib/connectionStore";
import type { SBNamespace, ServiceBusApi } from "./types";
import { MockServiceBusClient } from "./mockServiceBusClient";
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
//
// The app only holds a namespace-scoped connection (SAS/endpoint), not
// subscription-scoped ARM credentials, so namespace metadata (location,
// provisioning state, status, created time) isn't available — a namespace is
// just the connection's friendly name and endpoint.

export function listNamespaces(
  connections: NamespaceConnection[],
): SBNamespace[] {
  return connections.map((connection) => ({
    id: connection.id,
    name: connection.friendlyName,
    type: "Microsoft.ServiceBus/Namespaces",
    properties: {
      serviceBusEndpoint: connection.serviceBusEndpoint,
    },
  }));
}
