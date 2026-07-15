import { Box, Button, Divider, LinearProgress, Paper } from "@mui/material";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import NamespaceTree, { type SelectedEntity } from "./NamespaceTree";
import NamespacesHeader from "./NamespacesHeader";

interface NamespacesPanelProps {
  width: number;
  selectedId: string | null;
  onSelect: (entity: SelectedEntity) => void;
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  showConnect: boolean;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onConnect: () => void;
  onDisconnect: (namespaceName: string) => void;
  onEdit: (namespaceName: string) => void;
  onReorder: (orderedNamespaceNames: string[]) => void;
}

/** Left panel: the namespace header and the lazy-loaded entity tree. */
export default function NamespacesPanel({
  width,
  selectedId,
  onSelect,
  expandedItems,
  setExpandedItems,
  loading,
  showConnect,
  onRefresh,
  onCollapseAll,
  onConnect,
  onDisconnect,
  onEdit,
  onReorder,
}: NamespacesPanelProps) {
  return (
    <Paper
      square
      elevation={0}
      sx={{
        width,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <NamespacesHeader
          onRefresh={onRefresh}
          onCollapseAll={onCollapseAll}
          onConnect={onConnect}
        />
        <Divider />
        {loading && (
          <LinearProgress
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 2,
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <NamespaceTree
          selectedId={selectedId}
          onSelect={onSelect}
          expandedItems={expandedItems}
          setExpandedItems={setExpandedItems}
          onDisconnect={onDisconnect}
          onEdit={onEdit}
          onReorder={onReorder}
        />
        {showConnect && (
          <Box sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddLinkRoundedIcon />}
              onClick={onConnect}
              sx={{
                color: "text.secondary",
                borderColor: "divider",
                justifyContent: "flex-start",
                fontWeight: 400,
                "&:hover": {
                  borderColor: "text.secondary",
                  backgroundColor: "action.hover",
                },
              }}
            >
              Connect namespace
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
