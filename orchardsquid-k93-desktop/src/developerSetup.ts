export const developerPackages = {
  zebra: "xyz.willy.zebra",
  aptGet: "apt7",
  aptGetBootstrap: ["apt7-key", "berkeleydb", "apt7"],
  tools: ["git", "curl", "vim", "rsync", "make"],
  compiler: "org.coolstar.llvm-clang32",
  linker: "org.coolstar.cctools",
  compilerParts: [
    "org.coolstar.llvm-clang32",
    "org.coolstar.cctools",
    "org.coolstar.ld64",
    "uuid",
  ],
} as const;

export const developerPackageIds: string[] = [
  ...new Set([
    developerPackages.zebra,
    ...developerPackages.aptGetBootstrap,
    ...developerPackages.tools,
    ...developerPackages.compilerParts,
  ]),
];

export const compilerFolder = {
  path: "/usr/share/llvm",
  dataPath: "/private/var/llvm",
} as const;

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
