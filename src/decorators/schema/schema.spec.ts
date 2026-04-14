import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { SCHEMA_MARKER } from "../../metadata.js";
import { Schema } from "./schema.js";

describe("@Schema()", () => {
  it("marks the class with SCHEMA_MARKER metadata", () => {
    @Schema()
    class Marked {}
    expect(Reflect.getMetadata(SCHEMA_MARKER, Marked)).toBe(true);
  });
});
