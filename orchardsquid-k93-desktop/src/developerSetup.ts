export const developerPackages = {
  zebra: "xyz.willy.zebra",
  aptGet: "apt7",
  aptGetBootstrap: ["apt7-key", "berkeleydb", "apt7"],
  tools: ["git", "curl", "vim", "rsync", "make"],
} as const;

export const developerPackageIds: string[] = [
  ...new Set([
    developerPackages.zebra,
    ...developerPackages.aptGetBootstrap,
    ...developerPackages.tools,
  ]),
];

export const developerSources = {
  zebra: {
    prefix: "getzbra.com/repo",
    file: "zebra.list",
    line: "deb https://getzbra.com/repo/ ./",
  },
  lukeZgd: {
    prefix: "lukezgd.github.io/repo",
    file: "LukeZGD.list",
    line: "deb https://lukezgd.github.io/repo/ ./",
  },
} as const;
