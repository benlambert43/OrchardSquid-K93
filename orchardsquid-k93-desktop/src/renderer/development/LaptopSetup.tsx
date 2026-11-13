import { PanelNote } from "@orchardsquid-k93/ui";

import type { LaptopToolchain } from "@/bridge.ts";
import { developmentTarget } from "@/developmentSetup.ts";
import { type Step, type StepGroup, StepList } from "@/renderer/StepList.tsx";

const { sdk, sdkVersion, architecture } = developmentTarget;

function xcodeStep({ xcode }: LaptopToolchain): Step {
  const label = "Xcode";
  if (!xcode) {
    return {
      label,
      state: "todo",
      detail:
        "Not installed. Install Xcode from the App Store and open it once. Theos needs the full Xcode, not only the Command Line Tools.",
    };
  }
  if (!xcode.folder.includes(".app/")) {
    return {
      label,
      state: "todo",
      detail: `The selected developer folder is ${xcode.folder}, which is only the Command Line Tools. Install Xcode, then select it.`,
      command: "sudo xcode-select -s /Applications/Xcode.app",
    };
  }
  return {
    label,
    state: "done",
    detail: `${xcode.version ? `Version ${xcode.version}` : "Installed"}, selected at ${xcode.folder}.`,
  };
}

function linkerStep({ xcode, armv7Linker }: LaptopToolchain): Step {
  const label = `${architecture} compiler and linker`;
  return armv7Linker
    ? {
        label,
        state: "done",
        detail: `Xcode's clang and ld still build ${architecture}. Xcode's own iOS SDK has no ${architecture} libraries, so builds link against the iOS ${sdkVersion} SDK below instead.`,
      }
    : {
        label,
        state: "todo",
        detail: xcode
          ? `This Xcode's linker does not list ${architecture}, so it cannot build for the iPad 2.`
          : "Comes with Xcode.",
      };
}

function homebrewStep({ homebrew }: LaptopToolchain): Step {
  return homebrew
    ? { label: "Homebrew", state: "done", detail: `Installed at ${homebrew}.` }
    : {
        label: "Homebrew",
        state: "todo",
        detail:
          "Not installed. Theos installs its own tools with it. The Theos installer offers to install it too.",
        command:
          '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      };
}

function toolStep(
  label: string,
  file: string | null,
  formula: string,
  purpose: string,
): Step {
  return file
    ? { label, state: "done", detail: `Installed at ${file}. ${purpose}` }
    : {
        label,
        state: "todo",
        detail: `Not installed. ${purpose}`,
        command: `brew install ${formula}`,
      };
}

function theosStep({ theos }: LaptopToolchain): Step {
  return theos.installed
    ? { label: "Theos", state: "done", detail: `Installed in ${theos.folder}.` }
    : {
        label: "Theos",
        state: "todo",
        detail: `Not found in ${theos.folder}. The installer clones Theos to ~/theos, adds THEOS to your shell profile, and installs ldid with Homebrew. Run it in Terminal as yourself, not with sudo, then open a new Terminal window.`,
        command:
          'bash -c "$(curl -fsSL https://raw.githubusercontent.com/theos/theos/master/bin/install-theos)"',
      };
}

function sdkStep({ theos, sdk: installed }: LaptopToolchain): Step {
  const label = `iOS ${sdkVersion} SDK`;
  if (installed) {
    return {
      label,
      state: "done",
      detail: `${sdk}.sdk is in ${theos.folder}/sdks.`,
    };
  }
  return {
    label,
    state: "todo",
    detail: theos.installed
      ? `Not in ${theos.folder}/sdks. It holds the iOS ${sdkVersion} headers and the ${architecture} libraries to link against. Theos downloads it from github.com/theos/sdks.`
      : `Install Theos first. Its installer fetches only the newest SDK, which has no ${architecture} libraries.`,
    ...(theos.installed && { command: `$THEOS/bin/install-sdk ${sdk}` }),
  };
}

function buildGroups(toolchain: LaptopToolchain): StepGroup[] {
  return [
    {
      title: "Compiler",
      steps: [xcodeStep(toolchain), linkerStep(toolchain)],
    },
    {
      title: "Theos",
      steps: [
        homebrewStep(toolchain),
        theosStep(toolchain),
        sdkStep(toolchain),
        toolStep(
          "ldid",
          toolchain.ldid,
          "ldid",
          "It gives binaries the pseudo-signature iOS 9 needs before the kernel will run them.",
        ),
      ],
    },
    {
      title: "Shipping over USB",
      steps: [
        toolStep(
          "iproxy",
          toolchain.iproxy,
          "libusbmuxd",
          "It forwards a port on this Mac to the iPad's SSH over USB, so Theos can install builds without Wi-Fi.",
        ),
      ],
    },
  ];
}

export function LaptopSetup({ toolchain }: { toolchain: LaptopToolchain }) {
  return (
    <>
      <StepList groups={buildGroups(toolchain)} />
      <PanelNote>
        Run the commands in Terminal on this Mac, then refresh this page.
      </PanelNote>
    </>
  );
}
