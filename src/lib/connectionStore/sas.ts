// Parse an Azure Service Bus SAS connection string into its parts, e.g.:
//   Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=Root;SharedAccessKey=abc=
//
// Returns null when the required fields are missing.

export interface ParsedSasConnectionString {
  serviceBusEndpoint: string;
  keyName: string;
  key: string;
}

export function parseSasConnectionString(
  value: string,
): ParsedSasConnectionString | null {
  const parts = new Map<string, string>();
  for (const segment of value.split(";")) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const name = segment.slice(0, eq).trim().toLowerCase();
    const val = segment.slice(eq + 1).trim();
    if (name) parts.set(name, val);
  }

  const endpoint = parts.get("endpoint");
  const keyName = parts.get("sharedaccesskeyname");
  const key = parts.get("sharedaccesskey");
  if (!endpoint || !keyName || !key) return null;

  return { serviceBusEndpoint: endpoint, keyName, key };
}
