import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type {
  NamespaceConnection,
  NamespaceConnectionDraft,
} from "../lib/connectionStore";
import { parseSasConnectionString } from "../lib/connectionStore/sas";
import { signInWithEntra } from "../lib/entraAuth";

type AuthKind = "sas" | "entra";

interface ConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (draft: NamespaceConnectionDraft) => void;
  onSave?: (connection: NamespaceConnection) => void;
  connection?: NamespaceConnection | null;
  busy?: boolean;
}

const EMPTY = {
  friendlyName: "",
  endpoint: "",
  keyName: "",
  key: "",
  tenantId: "",
  connectionString: "",
};

function fieldsFromConnection(connection: NamespaceConnection): typeof EMPTY {
  const base = {
    ...EMPTY,
    friendlyName: connection.friendlyName,
    endpoint: connection.serviceBusEndpoint,
  };
  if (connection.auth.kind === "sas") {
    return {
      ...base,
      keyName: connection.auth.keyName,
      key: connection.auth.key,
    };
  }
  return {
    ...base,
    tenantId: connection.auth.tenantId,
  };
}

/** Add or edit a namespace connection (SAS now; Entra scaffolded). */
export default function ConnectionDialog({
  open,
  onClose,
  onAdd,
  onSave,
  connection,
  busy,
}: ConnectionDialogProps) {
  const isEdit = Boolean(connection);
  const [authKind, setAuthKind] = useState<AuthKind>("sas");
  const [fields, setFields] = useState(EMPTY);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the dialog is (re)opened, pre-filling from the
  // connection being edited when present.
  useEffect(() => {
    if (open) {
      setAuthKind(connection?.auth.kind ?? "sas");
      setFields(connection ? fieldsFromConnection(connection) : EMPTY);
      setSigningIn(false);
      setError(null);
    }
  }, [open, connection]);

  const set = (name: keyof typeof EMPTY, value: string) =>
    setFields((prev) => ({ ...prev, [name]: value }));

  const onConnectionStringChange = (value: string) => {
    const parsed = parseSasConnectionString(value);
    setFields((prev) => ({
      ...prev,
      connectionString: value,
      ...(parsed
        ? {
            endpoint: parsed.serviceBusEndpoint,
            keyName: parsed.keyName,
            key: parsed.key,
          }
        : {}),
    }));
  };

  const valid =
    fields.friendlyName.trim() !== "" &&
    fields.endpoint.trim() !== "" &&
    (authKind === "sas"
      ? fields.keyName.trim() !== "" && fields.key !== ""
      : fields.tenantId.trim() !== "");

  const submit = (
    auth: NamespaceConnection["auth"],
    base: Omit<NamespaceConnectionDraft, "auth">,
  ) => {
    if (isEdit && connection) {
      onSave?.({ id: connection.id, ...base, auth });
    } else {
      onAdd({ ...base, auth });
    }
  };

  const handleSubmit = async () => {
    if (!valid || signingIn) return;
    const base = {
      friendlyName: fields.friendlyName.trim(),
      serviceBusEndpoint: fields.endpoint.trim(),
    };

    if (authKind === "sas") {
      submit(
        { kind: "sas", keyName: fields.keyName.trim(), key: fields.key },
        base,
      );
      return;
    }

    const tenantId = fields.tenantId.trim();

    // When editing an Entra connection whose identity is unchanged, keep the
    // existing refresh token instead of forcing an interactive sign-in.
    if (
      isEdit &&
      connection?.auth.kind === "entra" &&
      connection.auth.tenantId === tenantId &&
      connection.auth.refreshToken
    ) {
      submit(
        {
          kind: "entra",
          tenantId,
          refreshToken: connection.auth.refreshToken,
        },
        base,
      );
      return;
    }

    setError(null);
    setSigningIn(true);
    try {
      const tokens = await signInWithEntra({ tenantId });
      submit(
        {
          kind: "entra",
          tenantId,
          refreshToken: tokens.refreshToken,
        },
        base,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? "Edit namespace" : "Connect namespace"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Friendly name"
            value={fields.friendlyName}
            onChange={(e) => set("friendlyName", e.target.value)}
            fullWidth
            autoFocus
          />

          <ToggleButtonGroup
            size="small"
            exclusive
            value={authKind}
            onChange={(_e, value) => value && setAuthKind(value)}
            aria-label="Authentication type"
          >
            <ToggleButton value="sas">SAS key</ToggleButton>
            <ToggleButton value="entra">Entra ID</ToggleButton>
          </ToggleButtonGroup>

          {authKind === "sas" ? (
            <>
              <TextField
                label="Connection string (optional)"
                placeholder="Endpoint=sb://…;SharedAccessKeyName=…;SharedAccessKey=…"
                value={fields.connectionString}
                onChange={(e) => onConnectionStringChange(e.target.value)}
                fullWidth
                helperText="Paste to auto-fill the fields below, or fill them manually."
              />
              <TextField
                label="Service Bus endpoint"
                value={fields.endpoint}
                onChange={(e) => set("endpoint", e.target.value)}
                fullWidth
              />
              <TextField
                label="Shared access key name"
                value={fields.keyName}
                onChange={(e) => set("keyName", e.target.value)}
                fullWidth
              />
              <TextField
                label="Shared access key"
                type="password"
                value={fields.key}
                onChange={(e) => set("key", e.target.value)}
                fullWidth
              />
            </>
          ) : (
            <>
              <TextField
                label="Service Bus endpoint"
                value={fields.endpoint}
                onChange={(e) => set("endpoint", e.target.value)}
                fullWidth
              />
              <TextField
                label="Directory (tenant) ID"
                value={fields.tenantId}
                onChange={(e) => set("tenantId", e.target.value)}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">
                Connecting opens your browser to sign in with Entra ID. A
                refresh token is stored so the connection stays signed in.
              </Typography>
            </>
          )}
        </Box>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!valid || busy || signingIn}
        >
          {signingIn
            ? "Signing in\u2026"
            : isEdit
              ? "Save"
              : authKind === "entra"
                ? "Sign in & connect"
                : "Connect"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
