import type { AnyAguiEvent, ParsedStreamFrame } from "./models";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseStreamEnvelope(
  activity: unknown
): ParsedStreamFrame | null {
  if (!isRecord(activity) || activity.type !== "message") {
    return null;
  }

  const value = activity.value;
  if (!isRecord(value)) {
    return null;
  }

  const stream = value.stream;
  if (!isRecord(stream) || !isRecord(stream.event)) {
    return null;
  }

  const event = stream.event as AnyAguiEvent;
  if (typeof event.type !== "string") {
    return null;
  }

  const runId = typeof stream.runId === "string" ? stream.runId : undefined;
  return { runId, event };
}

export function isStreamFrame(activity: unknown): boolean {
  return (
    isRecord(activity) &&
    activity.type === "message" &&
    isRecord(activity.value) &&
    isRecord((activity.value as Record<string, unknown>).stream)
  );
}
