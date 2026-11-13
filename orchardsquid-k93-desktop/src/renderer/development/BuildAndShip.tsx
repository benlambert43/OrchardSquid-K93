import { Panel, PanelNote } from "@orchardsquid-k93/ui";

import { developmentTarget } from "@/developmentSetup.ts";
import { type NumberedStep, NumberedSteps } from "@/renderer/NumberedSteps.tsx";

const { sdkVersion, minimumVersion, architecture, usbPort } = developmentTarget;
const sshHost = "ipad-usb";

const steps: NumberedStep[] = [
  {
    title: "Forward SSH over USB",
    command: `iproxy ${String(usbPort)}:22`,
    explanation: `Leave this running in its own Terminal window. Port ${String(usbPort)} on this Mac then reaches the iPad's SSH through the cable.`,
  },
  {
    title: "Name the tunnel in your SSH settings",
    command: String.raw`printf '\nHost ${sshHost}\n    HostName 127.0.0.1\n    Port ${String(usbPort)}\n    User root\n    IdentityFile ~/.ssh/orchardsquid-k93\n    HostKeyAlgorithms +ssh-rsa\n' >> ~/.ssh/config`,
    explanation: `Run this once. It adds an ${sshHost} entry that signs in with this app's key and allows the older host key the iPad's OpenSSH 6.7 offers.`,
  },
  {
    title: "Check the tunnel",
    command: `ssh ${sshHost} sysctl -n hw.machine`,
    explanation:
      'It prints "iPad2,1". The first time, SSH asks you to accept the iPad\'s host key for this address.',
  },
  {
    title: "Create a project",
    command: "$THEOS/bin/nic.pl",
    explanation:
      "Theos asks for a template and a name. iphone/tool makes a command-line program, iphone/application an app with an icon.",
  },
  {
    title: "Target the iPad 2",
    command: `TARGET = iphone:clang:${sdkVersion}:${minimumVersion}`,
    explanation: `In the project's Makefile, replace the TARGET line nic.pl wrote with this one, and set ARCHS = ${architecture} below it. Both go above the include lines. Theos then compiles against the iOS ${sdkVersion} SDK, for iOS ${minimumVersion} and later, as 32-bit ${architecture} only.`,
  },
  {
    title: "Build, package and install",
    command: `make package install THEOS_DEVICE_IP=${sshHost} THEOS_DEVICE_PORT=${String(usbPort)}`,
    explanation:
      "Theos compiles the project, signs it with ldid, wraps it in an iphoneos-arm .deb in the packages folder, copies it to the iPad over SSH, and installs it there with dpkg.",
  },
];

export function BuildAndShip() {
  return (
    <Panel title="Build and ship">
      <PanelNote>
        Once the laptop steps are done, these take a project from nothing to
        installed on the iPad. Run them in Terminal on this Mac.
      </PanelNote>
      <NumberedSteps steps={steps} />
    </Panel>
  );
}
