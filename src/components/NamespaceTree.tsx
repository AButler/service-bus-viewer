import { useEffect, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import CircleIcon from "@mui/icons-material/Circle";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import TopicRoundedIcon from "@mui/icons-material/TopicRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import {
  useNamespaces,
  useQueues,
  useSubscriptions,
  useTopics,
} from "../hooks/useServiceBus";
import type {
  MessageCountDetails,
  SBNamespace,
  SBQueue,
  SBSubscription,
  SBTopic,
} from "../api/types";

export interface SelectedEntity {
  itemId: string;
  kind: "queue" | "subscription";
  namespaceName: string;
  entityPath: string;
  label: string;
  countDetails: MessageCountDetails;
}

interface NamespaceTreeProps {
  selectedId: string | null;
  onSelect: (entity: SelectedEntity) => void;
}

// --- Small presentational helpers --------------------------------------------

function CountBadge({ active, dead }: { active: number; dead: number }) {
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

function EntityLabel({
  icon,
  name,
  active,
  dead,
  loading,
}: {
  icon: React.ReactNode;
  name: string;
  active?: number;
  dead?: number;
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
      {loading && <CircularProgress size={13} sx={{ ml: "auto" }} />}
      {!loading && active !== undefined && dead !== undefined && (
        <CountBadge active={active} dead={dead} />
      )}
    </Box>
  );
}

// A non-selectable child shown while a branch is loading so the user gets
// immediate feedback that the item is being expanded.
function LoadingItem({ parentId }: { parentId: string }) {
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

function MessageItem({ parentId, text }: { parentId: string; text: string }) {
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
function Placeholder({ parentId }: { parentId: string }) {
  return <TreeItem itemId={`${parentId}::placeholder`} label="" />;
}

// --- Leaf / branch item components --------------------------------------------

function QueueItem({
  namespaceName,
  queue,
}: {
  namespaceName: string;
  queue: SBQueue;
}) {
  const { activeMessageCount, deadLetterMessageCount } =
    queue.properties.countDetails;
  return (
    <TreeItem
      itemId={`queue:${namespaceName}/${queue.name}`}
      label={
        <EntityLabel
          icon={<InboxRoundedIcon fontSize="small" color="primary" />}
          name={queue.name}
          active={activeMessageCount}
          dead={deadLetterMessageCount}
        />
      }
    />
  );
}

function SubscriptionItem({
  namespaceName,
  topicName,
  subscription,
}: {
  namespaceName: string;
  topicName: string;
  subscription: SBSubscription;
}) {
  const { activeMessageCount, deadLetterMessageCount } =
    subscription.properties.countDetails;
  return (
    <TreeItem
      itemId={`subscription:${namespaceName}/${topicName}/${subscription.name}`}
      label={
        <EntityLabel
          icon={<AltRouteRoundedIcon fontSize="small" color="action" />}
          name={subscription.name}
          active={activeMessageCount}
          dead={deadLetterMessageCount}
        />
      }
    />
  );
}

function TopicItem({
  namespaceName,
  topic,
  expandedItems,
}: {
  namespaceName: string;
  topic: SBTopic;
  expandedItems: string[];
}) {
  const itemId = `topic:${namespaceName}/${topic.name}`;
  const isExpanded = expandedItems.includes(itemId);
  const subscriptions = useSubscriptions(namespaceName, topic.name, isExpanded);

  return (
    <TreeItem
      itemId={itemId}
      label={
        <EntityLabel
          icon={<TopicRoundedIcon fontSize="small" color="secondary" />}
          name={topic.name}
        />
      }
    >
      {!isExpanded ? (
        <Placeholder parentId={itemId} />
      ) : subscriptions.isPending ? (
        <LoadingItem parentId={itemId} />
      ) : subscriptions.data && subscriptions.data.length > 0 ? (
        subscriptions.data.map((s) => (
          <SubscriptionItem
            key={s.id}
            namespaceName={namespaceName}
            topicName={topic.name}
            subscription={s}
          />
        ))
      ) : (
        <MessageItem parentId={itemId} text="No subscriptions" />
      )}
    </TreeItem>
  );
}

function NamespaceChildren({
  namespaceName,
  expandedItems,
}: {
  namespaceName: string;
  expandedItems: string[];
}) {
  const queues = useQueues(namespaceName, true);
  const topics = useTopics(namespaceName, true);

  const queuesGroupId = `group:${namespaceName}:queues`;
  const topicsGroupId = `group:${namespaceName}:topics`;

  return (
    <>
      <TreeItem
        itemId={queuesGroupId}
        label={
          <EntityLabel
            icon={<FolderRoundedIcon fontSize="small" color="action" />}
            name={queues.data ? `Queues (${queues.data.length})` : "Queues"}
            loading={queues.isPending}
          />
        }
      >
        {queues.isPending ? (
          <LoadingItem parentId={queuesGroupId} />
        ) : queues.data && queues.data.length > 0 ? (
          queues.data.map((q) => (
            <QueueItem key={q.id} namespaceName={namespaceName} queue={q} />
          ))
        ) : (
          <MessageItem parentId={queuesGroupId} text="No queues" />
        )}
      </TreeItem>

      <TreeItem
        itemId={topicsGroupId}
        label={
          <EntityLabel
            icon={<FolderRoundedIcon fontSize="small" color="action" />}
            name={topics.data ? `Topics (${topics.data.length})` : "Topics"}
            loading={topics.isPending}
          />
        }
      >
        {topics.isPending ? (
          <LoadingItem parentId={topicsGroupId} />
        ) : topics.data && topics.data.length > 0 ? (
          topics.data.map((t) => (
            <TopicItem
              key={t.id}
              namespaceName={namespaceName}
              topic={t}
              expandedItems={expandedItems}
            />
          ))
        ) : (
          <MessageItem parentId={topicsGroupId} text="No topics" />
        )}
      </TreeItem>
    </>
  );
}

const namespaceStatusColor: Record<string, "success" | "warning" | "error"> = {
  Active: "success",
  Creating: "warning",
  Failed: "error",
};

function NamespaceItem({
  namespace,
  expandedItems,
}: {
  namespace: SBNamespace;
  expandedItems: string[];
}) {
  const itemId = `namespace:${namespace.name}`;
  const isExpanded = expandedItems.includes(itemId);
  const host = namespace.properties.serviceBusEndpoint
    .replace(/^https?:\/\//, "")
    .replace(/:443\/?$/, "");

  return (
    <TreeItem
      itemId={itemId}
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
          <CloudQueueRoundedIcon fontSize="small" color="action" />
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
          <CircleIcon
            sx={{ ml: "auto", fontSize: 10 }}
            color={
              namespaceStatusColor[namespace.properties.status] ?? "warning"
            }
          />
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

// --- Selection resolution -----------------------------------------------------

// Reads count details out of the React Query cache for the selected item so the
// header can show accurate totals without an extra request.
function useResolveSelection() {
  const queryClient = useQueryClient();

  return (itemId: string): SelectedEntity | null => {
    const separator = itemId.indexOf(":");
    const kind = itemId.slice(0, separator);
    const rest = itemId.slice(separator + 1);
    const parts = rest.split("/");
    const namespaceName = parts[0];

    if (kind === "queue") {
      const queues = queryClient.getQueryData<SBQueue[]>([
        "queues",
        namespaceName,
      ]);
      const queue = queues?.find((q) => q.name === parts[1]);
      if (!queue) return null;
      return {
        itemId,
        kind: "queue",
        namespaceName,
        entityPath: queue.name,
        label: queue.name,
        countDetails: queue.properties.countDetails,
      };
    }

    if (kind === "subscription") {
      const [, topicName, subName] = parts;
      const subscriptions = queryClient.getQueryData<SBSubscription[]>([
        "subscriptions",
        namespaceName,
        topicName,
      ]);
      const subscription = subscriptions?.find((s) => s.name === subName);
      if (!subscription) return null;
      return {
        itemId,
        kind: "subscription",
        namespaceName,
        entityPath: `${topicName}/${subName}`,
        label: `${topicName} / ${subName}`,
        countDetails: subscription.properties.countDetails,
      };
    }

    return null;
  };
}

// --- Tree ---------------------------------------------------------------------

export default function NamespaceTree({
  selectedId,
  onSelect,
}: NamespaceTreeProps) {
  const namespaces = useNamespaces();
  const resolveSelection = useResolveSelection();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
    // Keep the Queues/Topics folders open whenever their namespace is open.
    const next = new Set(itemIds);
    for (const id of itemIds) {
      if (id.startsWith("namespace:")) {
        const name = id.slice("namespace:".length);
        next.add(`group:${name}:queues`);
        next.add(`group:${name}:topics`);
      }
    }
    setExpandedItems([...next]);
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
    <SimpleTreeView
      selectedItems={selectedId}
      expandedItems={expandedItems}
      onExpandedItemsChange={handleExpandedItemsChange}
      onSelectedItemsChange={(_event, itemId) => {
        if (!itemId) return;
        const entity = resolveSelection(itemId);
        if (entity) onSelect(entity);
      }}
      sx={{ px: 1, py: 1, overflowY: "auto", flexGrow: 1 }}
    >
      {namespaces.data?.map((ns) => (
        <NamespaceItem
          key={ns.id}
          namespace={ns}
          expandedItems={expandedItems}
        />
      ))}
    </SimpleTreeView>
  );
}
