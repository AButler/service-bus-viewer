import { Badge, Box, IconButton, Tooltip, Typography } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import type { SBNamespace } from "../../api/types";
import { deriveNamespaceHost } from "../../lib/namespace";
import { useNamespaceConnected } from "../../hooks/useServiceBus";
import { Placeholder } from "./treeItems";
import NamespaceChildren from "./NamespaceChildren";

/** Top-level namespace branch with a host label and context menu. */
export default function NamespaceItem({
  namespace,
  expandedItems,
  menuOpen,
  onOpenMenu,
}: {
  namespace: SBNamespace;
  expandedItems: string[];
  menuOpen: boolean;
  onOpenMenu: (anchor: HTMLElement, namespaceName: string) => void;
}) {
  const itemId = `namespace:${namespace.name}`;
  const isExpanded = expandedItems.includes(itemId);
  const host = deriveNamespaceHost(namespace.properties.serviceBusEndpoint);
  const connected = useNamespaceConnected(namespace.name);

  return (
    <TreeItem
      itemId={itemId}
      label={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.5,
            "&:hover .namespace-menu-button": { display: "inline-flex" },
          }}
        >
          <Tooltip title={connected ? "Connected" : "Not connected yet"}>
            <Badge
              variant="dot"
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: connected
                    ? "success.main"
                    : "action.disabled",
                },
              }}
            >
              <CloudQueueRoundedIcon fontSize="small" color="action" />
            </Badge>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {namespace.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: "block" }}
            >
              {host}
            </Typography>
          </Box>
          <IconButton
            className="namespace-menu-button"
            size="small"
            aria-label={`${namespace.name} menu`}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu(event.currentTarget, namespace.name);
            }}
            sx={{
              ml: "auto",
              display: menuOpen ? "inline-flex" : "none",
            }}
          >
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      {isExpanded ? (
        <NamespaceChildren
          namespaceName={namespace.name}
          expandedItems={expandedItems}
        />
      ) : (
        <Placeholder parentId={itemId} />
      )}
    </TreeItem>
  );
}
