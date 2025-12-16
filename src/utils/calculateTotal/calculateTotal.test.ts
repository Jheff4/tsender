import { describe, it, expect } from "vitest"
import { calculateTotal } from "./calculateTotal"

describe("calculateTotal", () => {
  it("returns 0 for empty or whitespace-only input", () => {
    expect(calculateTotal("")).toBe(0)
    expect(calculateTotal("   ")).toBe(0)
    expect(calculateTotal("\n\n")).toBe(0)
  })

  it("sums comma-separated values", () => {
    expect(calculateTotal("10,20,30")).toBe(60)
  })

  it("sums newline-separated values", () => {
    expect(calculateTotal("10\n20\n30")).toBe(60)
  })

  it("handles mixed commas and newlines", () => {
    expect(calculateTotal("10, 20\n30")).toBe(60)
  })

  it("ignores extra spaces and empty entries", () => {
    expect(calculateTotal("10, ,  20,,\n30")).toBe(60)
  })

  it("returns 0 if any value is not a valid number", () => {
    expect(calculateTotal("10, abc, 20")).toBe(0)
  })

  it("handles decimal numbers correctly", () => {
    expect(calculateTotal("10.5, 20.25")).toBe(30.75)
  })

  it("treats partially invalid numbers as invalid", () => {
    expect(calculateTotal("10abc, 20")).toBe(0)
  })

  it("does not drop zero values", () => {
    expect(calculateTotal("0, 10, 20")).toBe(30)
  })
})
