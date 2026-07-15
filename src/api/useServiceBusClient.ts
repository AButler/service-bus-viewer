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
  if (!isTauri()) return new MockServiceBusClient(connection);
  return withLogging(new ServiceBusClient(connection), connection.friendlyName);
}

// Wrap a client so each API call (and any failure) is logged to the session log.
function withLogging(client: ServiceBusApi, namespace: string): ServiceBusApi {
  const run = async <R>(op: string, call: () => Promise<R>): Promise<R> => {
    console.info(`[Service Bus] ${namespace}: ${op}`);
    try {
      return await call();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Service Bus] ${namespace}: ${op} failed — ${message}`);
      throw err;
    }
  };

  return {
    listQueues: () => run("list queues", () => client.listQueues()),
    listTopics: () => run("list topics", () => client.listTopics()),
    listSubscriptions: (topicName) =>
      run(`list subscriptions of "${topicName}"`, () =>
        client.listSubscriptions(topicName),
      ),
    peekMessages: (params) =>
      run(
        `peek "${params.entityPath}"` +
          (params.view !== "active" ? ` (${params.view})` : "") +
          ` [skip ${params.skip}, top ${params.top}]`,
        () => client.peekMessages(params),
      ),
  };
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
