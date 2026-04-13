import { describe, expect, it } from "vitest";
import { VERSION } from "./index.js";

describe("index", () => {
  it("exports VERSION placeholder", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
