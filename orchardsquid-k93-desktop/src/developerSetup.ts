export const developerPackages = {
  zebra: "xyz.willy.zebra",
} as const;

export const developerPackageIds: string[] = [developerPackages.zebra];

export const developerSources = {
  zebra: {
    prefix: "getzbra.com/repo",
    file: "zebra.list",
    line: "deb https://getzbra.com/repo/ ./",
  },
} as const;
