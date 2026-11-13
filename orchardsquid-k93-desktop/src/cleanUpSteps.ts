export const cleanUpOptions = ["fonts", "translations", "systemData"] as const;

export type CleanUpOption = (typeof cleanUpOptions)[number];

export const cleanUpSteps = [
  "survey",
  "search",
  "folders",
  "languages",
  "update",
  ...cleanUpOptions,
] as const;

export type CleanUpStep = (typeof cleanUpSteps)[number];
