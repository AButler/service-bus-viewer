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
  return withLogging(getRealClient(connection), connection.friendlyName);
}

// Real clients are cached per connection so the in-memory Entra credential (its
// cached access token and the *rotating* refresh token) survives across calls.
// Creating a fresh client on every query would restart auth from the stored
// refresh token; Entra rotates refresh tokens on use (and SPA-style ones are
// single-use), so a recreated client would hit an already-consumed token and
// fall back to an interactive sign-in on every queue/sub-queue click.
const realClientCache = new Map<
  string,
  { signature: string; client: ServiceBusClient }
>();

// Identity of a connection that requires a *new* client when it changes. The
// Entra refresh token is deliberately excluded: it rotates on every use, and
// the cached client's in-memory token is always more current than the store.
function connectionSignature(connection: NamespaceConnection): string {
  const { auth } = connection;
  const authPart =
    auth.kind === "sas"
      ? `sas:${auth.keyName}:${auth.key}`
      : `entra:${auth.tenantId}`;
  return `${connection.serviceBusEndpoint}|${authPart}`;
}

function getRealClient(connection: NamespaceConnection): ServiceBusClient {
  const signature = connectionSignature(connection);
  const cached = realClientCache.get(connection.id);
  if (cached && cached.signature === signature) return cached.client;
  const client = new ServiceBusClient(connection);
  realClientCache.set(connection.id, { signature, client });
  return client;
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
    sendMessage: (params) =>
      run(`send to "${params.entityPath}"`, () => client.sendMessage(params)),
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
