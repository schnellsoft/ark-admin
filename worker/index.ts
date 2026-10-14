import handler from "vinext/server/app-router-entry";
import { ChatRoom } from "./chat-room";

export { ChatRoom };

const NOINDEX = "noindex, nofollow, noarchive, nosnippet, noimageindex";

function withNoIndex(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", NOINDEX);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response(
        [
          "# Ark Admin is a private PWA — do not crawl or index.",
          "User-agent: *",
          "Disallow: /",
          "",
        ].join("\n"),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": NOINDEX,
          },
        },
      );
    }

    if (url.pathname === "/api/public/ws") {
      const id = env.CHAT.idFromName("clinic-main");
      const stub = env.CHAT.get(id);
      // Do not wrap: Upgrade responses must stay intact.
      return stub.fetch(request);
    }

    const response = await handler.fetch(request);
    if (response.status === 101 || request.headers.get("Upgrade")) {
      return response;
    }
    return withNoIndex(response);
  },
};
