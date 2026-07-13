import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { Box, Chip, Typography } from "@mui/material";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import CircleIcon from "@mui/icons-material/Circle";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import TopicRoundedIcon from "@mui/icons-material/TopicRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import type { NamespaceNode } from "../data/mockData";

interface NamespaceTreeProps {
  namespaces: NamespaceNode[];
  selectedId: string | null;
  onSelect: (entityId: string | null) => void;
}

const statusColor: Record<NamespaceNode["status"], "success" | "warning" | "error"> = {
  connected: "success",
  connecting: "warning",
  error: "error",
};

function CountBadge({ active, dead }: { active: number; dead: number }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, ml: "auto", pl: 1 }}>
      {active > 0 && <Chip size="small" label={active} color="primary" variant="outlined" sx={{ height: 20 }} />}
      {dead > 0 && <Chip size="small" label={dead} color="error" variant="outlined" sx={{ height: 20 }} />}
    </Box>
  );
}

function EntityLabel({
  icon,
  name,
  active,
  dead,
}: {
  icon: React.ReactNode;
  name: string;
  active?: number;
  dead?: number;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25, pr: 0.5 }}>
      {icon}
      <Typography variant="body2" noWrap sx={{ flexShrink: 1, minWidth: 0 }}>
        {name}
      </Typography>
      {active !== undefined && dead !== undefined && <CountBadge active={active} dead={dead} />}
    </Box>
  );
}

export default function NamespaceTree({ namespaces, selectedId, onSelect }: NamespaceTreeProps) {
  return (
    <SimpleTreeView
      selectedItems={selectedId}
      onSelectedItemsChange={(_event, itemId) => {
        // Only leaf entities (queues / subscriptions) map to a message list.
        if (itemId && (itemId.includes("/q/") || itemId.includes("/s/"))) {
          onSelect(itemId);
        }
      }}
      defaultExpandedItems={namespaces.flatMap((ns) => [ns.id, `${ns.id}::queues`, `${ns.id}::topics`])}
      sx={{ px: 1, py: 1, overflowY: "auto", flexGrow: 1 }}
    >
      {namespaces.map((ns) => (
        <TreeItem
          key={ns.id}
          itemId={ns.id}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <CloudQueueRoundedIcon fontSize="small" color="action" />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {ns.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                  {ns.endpoint}
                </Typography>
              </Box>
              <CircleIcon sx={{ ml: "auto", fontSize: 10 }} color={statusColor[ns.status]} />
            </Box>
          }
        >
          <TreeItem
            itemId={`${ns.id}::queues`}
            label={<EntityLabel icon={<FolderRoundedIcon fontSize="small" color="action" />} name={`Queues (${ns.queues.length})`} />}
          >
            {ns.queues.map((q) => (
              <TreeItem
                key={q.id}
                itemId={q.id}
                label={
                  <EntityLabel
                    icon={<InboxRoundedIcon fontSize="small" color="primary" />}
                    name={q.name}
                    active={q.activeCount}
                    dead={q.deadLetterCount}
                  />
                }
              />
            ))}
          </TreeItem>

          <TreeItem
            itemId={`${ns.id}::topics`}
            label={<EntityLabel icon={<FolderRoundedIcon fontSize="small" color="action" />} name={`Topics (${ns.topics.length})`} />}
          >
            {ns.topics.map((t) => (
              <TreeItem
                key={t.id}
                itemId={t.id}
                label={<EntityLabel icon={<TopicRoundedIcon fontSize="small" color="secondary" />} name={t.name} />}
              >
                {t.subscriptions.map((s) => (
                  <TreeItem
                    key={s.id}
                    itemId={s.id}
                    label={
                      <EntityLabel
                        icon={<AltRouteRoundedIcon fontSize="small" color="action" />}
                        name={s.name}
                        active={s.activeCount}
                        dead={s.deadLetterCount}
                      />
                    }
                  />
                ))}
              </TreeItem>
            ))}
          </TreeItem>
        </TreeItem>
      ))}
    </SimpleTreeView>
  );
}
