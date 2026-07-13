import { TreeItem } from "@mui/x-tree-view/TreeItem";
import TopicRoundedIcon from "@mui/icons-material/TopicRounded";
import { useSubscriptions } from "../../hooks/useServiceBus";
import type { SBTopic } from "../../api/types";
import {
  EntityLabel,
  LoadingItem,
  MessageItem,
  Placeholder,
} from "./treeItems";
import SubscriptionItem from "./SubscriptionItem";

/** Tree branch for a topic; lazily loads its subscriptions when expanded. */
export default function TopicItem({
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
