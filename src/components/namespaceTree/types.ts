import type { MessageCountDetails, MessageView } from "../../api/types";

/** A queue/subscription/topic view selected in the tree, with its counts. */
export interface SelectedEntity {
  itemId: string;
  kind: "queue" | "subscription" | "topic";
  namespaceName: string;
  namespaceHost: string;
  entityPath: string;
  label: string;
  view: MessageView;
  countDetails: MessageCountDetails;
}
