import type { MessageCountDetails } from "../../api/types";

/** A queue or subscription selected in the tree, with its message counts. */
export interface SelectedEntity {
  itemId: string;
  kind: "queue" | "subscription";
  namespaceName: string;
  namespaceHost: string;
  entityPath: string;
  label: string;
  countDetails: MessageCountDetails;
}
