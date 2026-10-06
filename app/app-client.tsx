"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

function shouldListen(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/kids/") ||
    pathname.startsWith("/wall")
  );
}

export default function AppClient() {
  const pathname = usePathname();
  const router = useRouter();
  const lastEventId = useRef("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The app still works normally if service worker registration fails.
      });
    }
  }, []);

  useEffect(() => {
    if (!shouldListen(pathname)) {
      return;
    }

    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("bank-of-dad-sync")
        : null;

    const refresh = (eventId: string, rebroadcast: boolean) => {
      if (eventId && lastEventId.current === eventId) {
        return;
      }

      if (eventId) {
        lastEventId.current = eventId;
      }

      router.refresh();

      if (rebroadcast && channel) {
        channel.postMessage({
          type: "refresh",
          eventId,
        });
      }
    };

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type !== "refresh") {
          return;
        }

        refresh(String(event.data.eventId ?? ""), false);
      };
    }

    const source = new EventSource("/api/events");

    source.addEventListener("ready", () => {
      router.refresh();
    });

    source.addEventListener("refresh", (event) => {
      refresh((event as MessageEvent<string>).data, true);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const handleOnline = () => {
      router.refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      source.close();
      channel?.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [pathname, router]);

  return null;
}
