import { EventEmitter } from "node:events";

type FamilyListener = (eventId: string) => void;

const globalForRealtime = globalThis as unknown as {
  bankOfDadRealtime?: EventEmitter;
};

const emitter =
  globalForRealtime.bankOfDadRealtime ??
  new EventEmitter();

emitter.setMaxListeners(0);

if (!globalForRealtime.bankOfDadRealtime) {
  globalForRealtime.bankOfDadRealtime = emitter;
}

function channelName(familyId: string) {
  return `family:${familyId}`;
}

export function broadcastFamily(familyId: string) {
  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  emitter.emit(channelName(familyId), eventId);
  return eventId;
}

export function subscribeFamily(
  familyId: string,
  listener: FamilyListener,
) {
  const channel = channelName(familyId);
  emitter.on(channel, listener);

  return () => {
    emitter.off(channel, listener);
  };
}
