import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSessionTimer } from "./store";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useSessionTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it("ticks once per second while active and visible", () => {
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer("s1", 0, true, onTick),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current).toBe(3);
    expect(onTick).toHaveBeenLastCalledWith(3);
  });

  it("accumulates wall-clock seconds while the tab is hidden", () => {
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer("s1", 0, true, onTick),
    );

    // 5 s visible
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(5);

    // Hide tab and let 30 s of wall-clock time elapse. Browsers throttle
    // setInterval while hidden, but the elapsed wall time must still be
    // counted when the tab returns.
    act(() => {
      setHidden(true);
      vi.advanceTimersByTime(30000);
    });

    // Return to the tab.
    act(() => {
      setHidden(false);
    });

    // After becoming visible again, the timer should reflect the full
    // 35 s of wall-clock elapsed time, not just the 5 s before hiding.
    expect(result.current).toBeGreaterThanOrEqual(35);
    expect(onTick).toHaveBeenLastCalledWith(result.current);
  });

  it("does not tick when inactive", () => {
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer("s1", 10, false, onTick),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(10);
    expect(onTick).not.toHaveBeenCalled();
  });
});
