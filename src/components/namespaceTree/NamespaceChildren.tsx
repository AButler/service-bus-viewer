import { TreeItem } from "@mui/x-tree-view/TreeItem";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import { useQueues, useTopics } from "../../hooks/useServiceBus";
import { EntityLabel, LoadingItem, MessageItem } from "./treeItems";
import QueueItem from "./QueueItem";
import TopicItem from "./TopicItem";

/** The "Queues" and "Topics" group branches under a namespace. */
export default function NamespaceChildren({
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
            name="Queues"
            count={queues.data?.length}
            loading={queues.isPending}
          />
        }
      >
        {queues.isPending ? (
          <LoadingItem parentId={queuesGroupId} />
        ) : queues.isError ? (
          <MessageItem
            parentId={queuesGroupId}
            text={`Failed to load: ${(queues.error as Error).message}`}
          />
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
            name="Topics"
            count={topics.data?.length}
            loading={topics.isPending}
          />
        }
      >
        {topics.isPending ? (
          <LoadingItem parentId={topicsGroupId} />
        ) : topics.isError ? (
          <MessageItem
            parentId={topicsGroupId}
            text={`Failed to load: ${(topics.error as Error).message}`}
          />
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
