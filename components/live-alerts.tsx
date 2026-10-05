"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LiveAlerts({ unreadCount }: { unreadCount: number }) {
  const [count, setCount] = useState(unreadCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCount(unreadCount);
    if ("setAppBadge" in navigator) {
      if (unreadCount > 0) {
        void (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
          unreadCount,
        );
      } else if ("clearAppBadge" in navigator) {
        void (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    }
  }, [unreadCount]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/public/ws?role=admin&name=AdminDesk`,
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string; role?: string };
        if (data.type === "chat" && data.role !== "admin") {
          setCount((c) => c + 1);
          void audioRef.current?.play().catch(() => undefined);
          if ("setAppBadge" in navigator) {
            void (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
              count + 1,
            );
          }
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
  }, [count]);

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6NfGxqcn2Mk5OLgXBsdn+Jj5CLg3JwdoCJj5GNhHFvd4GKkJGMhHFvd4CJj5GMhHFvd4CJj5GMhHJvcICIj5GMhHJvcICIj5GMhHJvcICIj5GMhHJvcA=="
          type="audio/wav"
        />
      </audio>
      <Bell className="h-4 w-4 text-teal-800" />
      <Badge>{count} unread</Badge>
    </div>
  );
}
