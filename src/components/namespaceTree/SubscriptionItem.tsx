import { TreeItem } from "@mui/x-tree-view/TreeItem";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import type { SBSubscription } from "../../api/types";
import { EntityLabel } from "./treeItems";
import SubQueueItem from "./SubQueueItem";

/** Tree branch for a subscription: main label plus its sub-queues. */
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
  const baseItemId = `subscription:${namespaceName}/${topicName}/${subscription.name}`;
  return (
    <TreeItem
      itemId={baseItemId}
      label={
        <EntityLabel
          icon={<AltRouteRoundedIcon fontSize="small" color="action" />}
          name={subscription.name}
          active={activeMessageCount}
          dead={deadLetterMessageCount}
        />
      }
    >
      <SubQueueItem
        baseItemId={baseItemId}
        view="deadletter"
        label="Dead-letter"
        icon={<ReportProblemRoundedIcon fontSize="small" color="error" />}
        count={deadLetterMessageCount}
      />
      <SubQueueItem
        baseItemId={baseItemId}
        view="deferred"
        label="Deferred"
        icon={<PauseCircleOutlineRoundedIcon fontSize="small" color="action" />}
      />
    </TreeItem>
  );
}
