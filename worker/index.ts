import handler from "vinext/server/app-router-entry";
import { ChatRoom } from "./chat-room";

export { ChatRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/public/ws") {
      const id = env.CHAT.idFromName("clinic-main");
      const stub = env.CHAT.get(id);
      return stub.fetch(request);
    }

    return handler.fetch(request);
  },
};
