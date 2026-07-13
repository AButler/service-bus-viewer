import { TreeItem } from "@mui/x-tree-view/TreeItem";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import type { SBSubscription } from "../../api/types";
import { EntityLabel } from "./treeItems";

/** Tree leaf for a subscription, showing active/dead-letter counts. */
export default function SubscriptionItem({
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
