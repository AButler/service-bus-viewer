/**
 * Derive a namespace host from its Service Bus endpoint: the URL hostname, with
 * `:<port>` appended only when the port is non-standard for the protocol.
 */
export function deriveNamespaceHost(serviceBusEndpoint: string): string {
  try {
    const url = new URL(serviceBusEndpoint);
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return serviceBusEndpoint;
  }
}
