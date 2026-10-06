import { getCurrentUser } from "@/lib/auth";
import { getRegisteredDevice } from "@/lib/device-auth";
import { subscribeFamily } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const device = user ? null : await getRegisteredDevice();

  const familyId =
    user?.familyId ??
    (device && device.status !== "REVOKED" ? device.familyId : null);

  if (!familyId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }

        try {
          controller.close();
        } catch {
          // The stream may already be closed by the client.
        }
      };

      const send = (chunk: string) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      send("event: ready\ndata: connected\n\n");

      unsubscribe = subscribeFamily(familyId, (eventId) => {
        send(`event: refresh\ndata: ${eventId}\n\n`);
      });

      heartbeat = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, 20000);

      request.signal.addEventListener("abort", close, { once: true });
    },

    cancel() {
      closed = true;

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
