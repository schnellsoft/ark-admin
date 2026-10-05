import { DurableObject } from "cloudflare:workers";

type SessionMeta = {
  role: "admin" | "visitor";
  name: string;
  userId?: string;
};

export class ChatRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const role = (url.searchParams.get("role") ?? "visitor") as SessionMeta["role"];
    const name = url.searchParams.get("name") ?? "Guest";
    const userId = url.searchParams.get("userId") ?? undefined;

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, name, userId } satisfies SessionMeta);

    server.send(
      JSON.stringify({
        type: "system",
        body: `Connected as ${name}`,
        at: new Date().toISOString(),
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    let parsed: { type?: string; body?: string };
    try {
      parsed = JSON.parse(message) as { type?: string; body?: string };
    } catch {
      return;
    }

    const meta = (ws.deserializeAttachment() ?? {
      role: "visitor",
      name: "Guest",
    }) as SessionMeta;

    const payload = {
      type: parsed.type ?? "chat",
      body: parsed.body ?? "",
      from: meta.name,
      role: meta.role,
      userId: meta.userId,
      at: new Date().toISOString(),
    };

    if (payload.body.trim()) {
      await this.env.DB.prepare(
        `INSERT INTO messages (id, type, from_user_id, from_name, body, created_at)
         VALUES (?, 'chat', ?, ?, ?, datetime('now'))`,
      )
        .bind(crypto.randomUUID(), meta.userId ?? null, meta.name, payload.body)
        .run();
    }

    this.broadcast(JSON.stringify(payload));
  }

  async webSocketClose(ws: WebSocket) {
    ws.close();
  }

  private broadcast(message: string) {
    for (const peer of this.ctx.getWebSockets()) {
      try {
        peer.send(message);
      } catch {
        // ignore closed sockets
      }
    }
  }
}
