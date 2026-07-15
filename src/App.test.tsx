import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "./App";
import theme from "./theme";
import { getConnectionStore } from "./lib/connectionStore";

let currentPath = "/";

function LocationProbe() {
  currentPath = useLocation().pathname;
  return null;
}

function seedContosoProd() {
  return getConnectionStore().add({
    friendlyName: "contoso-prod",
    serviceBusEndpoint: "sb://contoso-prod.servicebus.windows.net/",
    auth: { kind: "sas", keyName: "Root", key: "secret" },
  });
}

function renderApp(initialEntry = "/") {
  currentPath = initialEntry;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme} defaultMode="light">
        <MemoryRouter initialEntries={[initialEntry]}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("App routing", () => {
  it("shows the empty state when there are no connections", async () => {
    renderApp("/");
    expect(
      await screen.findByText(/select a queue or subscription/i),
    ).toBeInTheDocument();
  });

  describe("with a configured namespace", () => {
    beforeEach(async () => {
      await seedContosoProd();
    });

    it("restores a queue selection from a deep link", async () => {
      renderApp("/contoso-prod/queues/orders/messages");
      expect(
        await screen.findByRole("button", { name: "Refresh messages" }),
      ).toBeInTheDocument();
    });

    it("restores the dead-letter view from a deep link", async () => {
      renderApp("/contoso-prod/queues/orders/dead-letters");
      expect(await screen.findByText("Dead Letter Reason")).toBeInTheDocument();
    });

    it("restores a subscription selection from a deep link", async () => {
      renderApp("/contoso-prod/topics/order-events/audit/messages");
      expect(
        await screen.findByText("order-events / audit"),
      ).toBeInTheDocument();
    });

    it("redirects to the root for an unknown namespace", async () => {
      renderApp("/ghost-namespace/queues/orders/messages");
      await waitFor(() => expect(currentPath).toBe("/"));
    });

    it("redirects to the root for an unknown queue", async () => {
      renderApp("/contoso-prod/queues/does-not-exist/messages");
      await waitFor(() => expect(currentPath).toBe("/"));
    });

    it("redirects to the owning queue when the message is not found", async () => {
      renderApp("/contoso-prod/queues/orders/messages/99999999");
      await waitFor(
        () => expect(currentPath).toBe("/contoso-prod/queues/orders/messages"),
        { timeout: 4000 },
      );
    });
  });
});
