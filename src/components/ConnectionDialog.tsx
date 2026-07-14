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
import type { NamespaceConnectionDraft } from "../lib/connectionStore";
import { parseSasConnectionString } from "../lib/connectionStore/sas";

type AuthKind = "sas" | "entra";

interface ConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (draft: NamespaceConnectionDraft) => void;
  busy?: boolean;
}

const EMPTY = {
  friendlyName: "",
  endpoint: "",
  keyName: "",
  key: "",
  tenantId: "",
  clientId: "",
  connectionString: "",
};

/** Add a namespace connection (SAS now; Entra scaffolded). */
export default function ConnectionDialog({
  open,
  onClose,
  onAdd,
  busy,
}: ConnectionDialogProps) {
  const [authKind, setAuthKind] = useState<AuthKind>("sas");
  const [fields, setFields] = useState(EMPTY);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setAuthKind("sas");
      setFields(EMPTY);
    }
  }, [open]);

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
      : fields.tenantId.trim() !== "" && fields.clientId.trim() !== "");

  const handleAdd = () => {
    if (!valid) return;
    const draft: NamespaceConnectionDraft = {
      friendlyName: fields.friendlyName.trim(),
      serviceBusEndpoint: fields.endpoint.trim(),
      auth:
        authKind === "sas"
          ? { kind: "sas", keyName: fields.keyName.trim(), key: fields.key }
          : {
              kind: "entra",
              tenantId: fields.tenantId.trim(),
              clientId: fields.clientId.trim(),
            },
    };
    onAdd(draft);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect namespace</DialogTitle>
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
              <TextField
                label="Application (client) ID"
                value={fields.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                fullWidth
              />
              <Typography variant="caption" color="text.secondary">
                Interactive Entra sign-in is coming soon; credentials are stored
                for the connection now.
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!valid || busy}
        >
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
}
