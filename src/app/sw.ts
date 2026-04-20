import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push handler ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data: Record<string, string> = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "Notification";
  const body = data.body ?? "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon ?? "/icon-192.png",
      badge: data.badge ?? "/icon-mono-badge.png",
      data,
      tag: data.tag ?? "default",
    } as NotificationOptions),
  );

  // iOS PWA badge
  if ("setAppBadge" in self.navigator) {
    event.waitUntil(
      (self.navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(1),
    );
  }

  // Forward to foreground clients for in-app toasts
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) =>
      clients.forEach((c) => c.postMessage({ type: "PUSH_RECEIVED", data })),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if ("clearAppBadge" in self.navigator) {
    (self.navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
  }

  const targetUrl = (event.notification.data?.url as string) ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          return (client as WindowClient).navigate(targetUrl).then((c) => c?.focus());
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
