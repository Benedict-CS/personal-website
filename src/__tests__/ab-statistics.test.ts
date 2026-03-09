import { evaluateABExperiment } from "@/lib/ab/statistics";

describe("A/B statistical evaluation", () => {
  it("returns significant winner when variant B strongly outperforms", () => {
    const result = evaluateABExperiment(
      { views: 2000, conversions: 60 },
      { views: 2100, conversions: 120 }
    );
    expect(result.significant).toBe(true);
    expect(result.winner).toBe("B");
  });

  it("returns no winner when difference is statistically weak", () => {
    const result = evaluateABExperiment(
      { views: 500, conversions: 15 },
      { views: 510, conversions: 16 }
    );
    expect(result.winner).toBe("none");
  });
});

