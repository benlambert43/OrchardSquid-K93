export const developerPackages = {
  zebra: "xyz.willy.zebra",
} as const;

export const developerPackageIds: string[] = [developerPackages.zebra];

const zebraRepository = "https://getzbra.com/repo/";

export const developerSources = {
  zebra: {
    prefix: "getzbra.com/repo",
    file: "zebra.list",
    url: zebraRepository,
    line: `deb ${zebraRepository} ./`,
  },
} as const;
