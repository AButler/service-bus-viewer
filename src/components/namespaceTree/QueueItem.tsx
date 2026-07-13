import { TreeItem } from "@mui/x-tree-view/TreeItem";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import type { SBQueue } from "../../api/types";
import { EntityLabel } from "./treeItems";

/** Tree leaf for a queue, showing active/dead-letter counts. */
export default function QueueItem({
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
