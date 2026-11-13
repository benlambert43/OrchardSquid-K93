export const developmentTarget = {
  sdk: "iPhoneOS9.3",
  sdkVersion: "9.3",
  minimumVersion: "9.0",
  architecture: "armv7",
  usbPort: 2222,
  sshHost: "ipad-usb",
} as const;

export const theosSource = {
  repository: "https://github.com/theos/theos.git",
  sdkRelease: "https://api.github.com/repos/theos/sdks/releases/latest",
  sdkDownloads: "https://github.com/theos/sdks/releases/download/",
} as const;

export const laptopTools = ["theos", "sdk", "ldid", "xz"] as const;

export type LaptopToolName = (typeof laptopTools)[number];

export const laptopInstallOptions = ["shellProfile"] as const;

export type LaptopInstallOption = (typeof laptopInstallOptions)[number];

export const projectTemplates = {
  tool: "iphone/tool",
  application: "iphone/application_modern",
  tweak: "iphone/tweak",
  library: "iphone/library",
} as const;

export type ProjectTemplate = keyof typeof projectTemplates;

export const projectNamePattern = "[A-Za-z0-9][A-Za-z0-9+.\\-]*";

export const packageIdPattern = "[a-z0-9][a-z0-9+.\\-]+";

export const buildOptions = ["install"] as const;

export type BuildOption = (typeof buildOptions)[number];

export const developmentSteps = [
  "clone",
  "submodules",
  "shellProfile",
  "release",
  "download",
  "unpack",
  "adjust",
  "homebrew",
  "build",
  "copy",
  "dpkg",
  "homeScreen",
] as const;

export type DevelopmentStep = (typeof developmentSteps)[number];

export type DevelopmentTask = LaptopToolName | "build" | "package";

export const firstInstallSteps: Record<LaptopToolName, DevelopmentStep> = {
  theos: "clone",
  sdk: "release",
  ldid: "homebrew",
  xz: "homebrew",
};
