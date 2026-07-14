import { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import {
  Box,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import { useNamespaces } from "../hooks/useServiceBus";
import NamespaceItem from "./namespaceTree/NamespaceItem";
import { useResolveSelection } from "./namespaceTree/useResolveSelection";
import type { SelectedEntity } from "./namespaceTree/types";

export type { SelectedEntity } from "./namespaceTree/types";

interface NamespaceTreeProps {
  selectedId: string | null;
  onSelect: (entity: SelectedEntity) => void;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  onDisconnect: (namespaceName: string) => void;
}

export default function NamespaceTree({
  selectedId,
  onSelect,
  expandedItems,
  setExpandedItems,
  onDisconnect,
}: NamespaceTreeProps) {
  const namespaces = useNamespaces();
  const resolveSelection = useResolveSelection();

  // Auto-expand the first namespace (and its groups) once loaded.
  const firstNamespace = namespaces.data?.[0]?.name;
  useEffect(() => {
    if (firstNamespace) {
      setExpandedItems((current) =>
        current.length > 0
          ? current
          : [
              `namespace:${firstNamespace}`,
              `group:${firstNamespace}:queues`,
              `group:${firstNamespace}:topics`,
            ],
      );
    }
  }, [firstNamespace]);

  const handleExpandedItemsChange = (
    _event: React.SyntheticEvent | null,
    itemIds: string[],
  ) => {
    setExpandedItems(itemIds);
  };

  // The namespace context menu is rendered here (outside any TreeItem) so its
  // clicks don't bubble through the React tree to the item's expansion handler.
  const [namespaceMenu, setNamespaceMenu] = useState<{
    anchorEl: HTMLElement;
    namespaceName: string;
  } | null>(null);

  const handleDisconnect = () => {
    if (namespaceMenu) onDisconnect(namespaceMenu.namespaceName);
    setNamespaceMenu(null);
  };

  if (namespaces.isPending) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading namespaces…
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <SimpleTreeView
        selectedItems={selectedId}
        expandedItems={expandedItems}
        onExpandedItemsChange={handleExpandedItemsChange}
        onSelectedItemsChange={(_event, itemId) => {
          if (!itemId) return;
          const entity = resolveSelection(itemId);
          if (entity) onSelect(entity);
        }}
        sx={{ px: 1, py: 1 }}
      >
        {namespaces.data?.map((ns) => (
          <NamespaceItem
            key={ns.id}
            namespace={ns}
            expandedItems={expandedItems}
            menuOpen={namespaceMenu?.namespaceName === ns.name}
            onOpenMenu={(anchorEl, namespaceName) =>
              setNamespaceMenu({ anchorEl, namespaceName })
            }
          />
        ))}
      </SimpleTreeView>
      <Menu
        anchorEl={namespaceMenu?.anchorEl ?? null}
        open={Boolean(namespaceMenu)}
        onClose={() => setNamespaceMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleDisconnect}>
          <ListItemIcon>
            <LinkOffRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Disconnect namespace</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
