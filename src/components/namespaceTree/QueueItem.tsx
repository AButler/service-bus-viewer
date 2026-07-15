import { TreeItem } from "@mui/x-tree-view/TreeItem";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import SyncProblemRoundedIcon from "@mui/icons-material/SyncProblemRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import type { SBQueue } from "../../api/types";
import { EntityLabel } from "./treeItems";
import SubQueueItem from "./SubQueueItem";

/** Tree branch for a queue: main label plus its sub-queues. */
export default function QueueItem({
  namespaceName,
  queue,
}: {
  namespaceName: string;
  queue: SBQueue;
}) {
  const {
    activeMessageCount,
    deadLetterMessageCount,
    transferDeadLetterMessageCount,
    scheduledMessageCount,
  } = queue.properties.countDetails;
  const baseItemId = `queue:${namespaceName}/${queue.name}`;
  return (
    <TreeItem
      itemId={baseItemId}
      label={
        <EntityLabel
          icon={<InboxRoundedIcon fontSize="small" color="primary" />}
          name={queue.name}
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
        view="transferDeadletter"
        label="Transfer dead-letter"
        icon={<SyncProblemRoundedIcon fontSize="small" color="error" />}
        count={transferDeadLetterMessageCount}
      />
      <SubQueueItem
        baseItemId={baseItemId}
        view="scheduled"
        label="Scheduled"
        icon={<ScheduleRoundedIcon fontSize="small" color="action" />}
        count={scheduledMessageCount}
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
