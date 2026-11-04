export const noteLengthMultipliers: Record<
  | "whole"
  | "whole dotted"
  | "whole double-dotted"
  | "half"
  | "half dotted"
  | "half double-dotted"
  | "quarter"
  | "quarter dotted"
  | "quarter double-dotted"
  | "eighth"
  | "eighth dotted"
  | "eighth double-dotted"
  | "sixteenth"
  | "sixteenth dotted"
  | "sixteenth double-dotted",
  number
> = {
  whole: 4,
  "whole dotted": 6,
  "whole double-dotted": 7,
  half: 2,
  "half dotted": 3,
  "half double-dotted": 3.5,
  quarter: 1,
  "quarter dotted": 1.5,
  "quarter double-dotted": 1.75,
  eighth: 0.5,
  "eighth dotted": 0.75,
  "eighth double-dotted": 0.875,
  sixteenth: 0.25,
  "sixteenth dotted": 0.375,
  "sixteenth double-dotted": 0.4375,
};
