/**
 * Tests for slot detector
 */

import { describe, it, expect } from "@jest/globals";
import { detectSlots, pathToString, stringToPath } from "@/compression/slot-detector";
import type { SimplifiedNode } from "@/extractors/types";

describe("Slot Detector", () => {
  it("should detect text variations across instances", () => {
    const instances: SimplifiedNode[] = [
      {
        id: "1",
        name: "Card 1",
        type: "INSTANCE",
        children: [
          {
            id: "1-1",
            name: "Title",
            type: "TEXT",
            text: "Card One",
          },
        ],
      },
      {
        id: "2",
        name: "Card 2",
        type: "INSTANCE",
        children: [
          {
            id: "2-1",
            name: "Title",
            type: "TEXT",
            text: "Card Two",
          },
        ],
      },
    ];

    const result = detectSlots(instances);

    // Should detect text as a slot
    expect(result.slots.size).toBeGreaterThan(0);
    expect(result.similarityScore).toBeLessThan(1);
  });

  it("should detect identical structures (no slots)", () => {
    const instances: SimplifiedNode[] = [
      {
        id: "1",
        name: "Card",
        type: "INSTANCE",
        children: [
          {
            id: "1-1",
            name: "Rect",
            type: "RECTANGLE",
            opacity: 1,
          },
        ],
      },
      {
        id: "2",
        name: "Card",
        type: "INSTANCE",
        children: [
          {
            id: "2-1",
            name: "Rect",
            type: "RECTANGLE",
            opacity: 1,
          },
        ],
      },
    ];

    const result = detectSlots(instances);

    // Should have high similarity (identical structure)
    expect(result.similarityScore).toBeCloseTo(1);
    expect(result.slots.size).toBe(0);
  });

  it("should handle single instance", () => {
    const instances: SimplifiedNode[] = [
      {
        id: "1",
        name: "Card",
        type: "INSTANCE",
        children: [],
      },
    ];

    const result = detectSlots(instances);

    expect(result.slots.size).toBe(0);
    expect(result.similarityScore).toBe(1);
  });
});

describe("Path Utilities", () => {
  it("should convert path to string", () => {
    const path = ["children", 0, "text"];
    const str = pathToString(path);
    expect(str).toBe("children[0].text");
  });

  it("should convert string to path (bracket notation)", () => {
    const str = "children[0].text";
    const path = stringToPath(str);
    expect(path).toEqual(["children", 0, "text"]);
  });

  it("should round-trip path conversion", () => {
    const originalPath = ["children", 0, "children", 1, "fills"];
    const str = pathToString(originalPath);
    const roundTripPath = stringToPath(str);
    expect(roundTripPath).toEqual(originalPath);
  });
});
