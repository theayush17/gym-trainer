export function calculateBmi(weight: number, heightInCm: number): number {
  const heightInMeters = heightInCm / 100;

  if (!weight || !heightInMeters) {
    return 0;
  }

  return Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
}

export type BmiCategory = "underweight" | "normal" | "overweight";

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) {
    return "underweight";
  }

  if (bmi < 25) {
    return "normal";
  }

  return "overweight";
}
