import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view/TreeItem";

/** Primary/dead-letter count chips shown at the end of an entity label. */
export function CountBadge({ active, dead }: { active: number; dead: number }) {
  if (active === 0 && dead === 0) return null;
  return (
    <Box sx={{ display: "flex", gap: 0.5, ml: "auto", pl: 1 }}>
      {active > 0 && (
        <Chip
          size="small"
          label={active}
          color="primary"
          variant="outlined"
          sx={{ height: 20 }}
        />
      )}
      {dead > 0 && (
        <Chip
          size="small"
          label={dead}
          color="error"
          variant="outlined"
          sx={{ height: 20 }}
        />
      )}
    </Box>
  );
}

/** Icon + name label with an optional count chip or active/dead badges. */
export function EntityLabel({
  icon,
  name,
  active,
  dead,
  count,
  loading,
}: {
  icon: React.ReactNode;
  name: string;
  active?: number;
  dead?: number;
  count?: number;
  loading?: boolean;
}) {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25, pr: 0.5 }}
    >
      {icon}
      <Typography variant="body2" noWrap sx={{ flexShrink: 1, minWidth: 0 }}>
        {name}
      </Typography>
      {loading && <CircularProgress size={13} />}
      {!loading && count !== undefined && (
        <Chip
          size="small"
          label={count}
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      )}
      {!loading && active !== undefined && dead !== undefined && (
        <CountBadge active={active} dead={dead} />
      )}
    </Box>
  );
}

// A non-selectable child shown while a branch is loading so the user gets
// immediate feedback that the item is being expanded.
export function LoadingItem({ parentId }: { parentId: string }) {
  return (
    <TreeItem
      itemId={`${parentId}::loading`}
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">
            Loading…
          </Typography>
        </Box>
      }
    />
  );
}

/** A non-selectable "empty" child (e.g. "No queues"). */
export function MessageItem({
  parentId,
  text,
}: {
  parentId: string;
  text: string;
}) {
  return (
    <TreeItem
      itemId={`${parentId}::empty`}
      label={
        <Typography variant="caption" color="text.secondary" sx={{ py: 0.5 }}>
          {text}
        </Typography>
      }
    />
  );
}

// Placeholder rendered under a collapsed branch so the expand chevron appears
// before the real children have been requested.
export function Placeholder({ parentId }: { parentId: string }) {
  return <TreeItem itemId={`${parentId}::placeholder`} label="" />;
}
