import { describe, it, expect } from "vitest";
import { parseStreamEnvelope, isStreamFrame } from "./parseEnvelope";

const streamActivity = (event: unknown, runId = "run_1") => ({
  type: "message",
  from: { role: "bot" },
  value: { stream: { runId, event } },
});

describe("parseStreamEnvelope", () => {
  it("extracts the typed event and stream id from a stream activity", () => {
    const frame = parseStreamEnvelope(
      streamActivity({ type: "RUN_STARTED", runId: "r1" })
    );
    expect(frame?.runId).toBe("run_1");
    expect(frame?.event.type).toBe("RUN_STARTED");
  });

  it("returns null for a plain (non-stream) message", () => {
    expect(parseStreamEnvelope({ type: "message", text: "hi" })).toBeNull();
  });

  it("returns null for a non-message activity", () => {
    expect(parseStreamEnvelope({ type: "typing" })).toBeNull();
  });

  it("returns null when the event has no string type", () => {
    expect(parseStreamEnvelope(streamActivity({ foo: "bar" }))).toBeNull();
  });

  it("never throws on malformed input", () => {
    expect(parseStreamEnvelope(null)).toBeNull();
    expect(parseStreamEnvelope(undefined)).toBeNull();
    expect(parseStreamEnvelope(42)).toBeNull();
    expect(
      parseStreamEnvelope({ type: "message", value: { stream: "nope" } })
    ).toBeNull();
  });
});

describe("isStreamFrame", () => {
  it("is true for a message carrying a stream payload, even if the event is malformed", () => {
    expect(isStreamFrame(streamActivity({ foo: "bar" }))).toBe(true);
    expect(isStreamFrame({ type: "message", value: { stream: {} } })).toBe(
      true
    );
  });

  it("is false for a plain message or a non-message activity", () => {
    expect(isStreamFrame({ type: "message", text: "hi" })).toBe(false);
    expect(isStreamFrame({ type: "typing" })).toBe(false);
    expect(isStreamFrame(null)).toBe(false);
  });
});
