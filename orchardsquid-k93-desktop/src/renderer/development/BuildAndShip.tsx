import { Panel } from "@orchardsquid-k93/ui";

import { developmentTarget } from "@/developmentSetup.ts";
import { InstallPackage } from "@/renderer/development/InstallPackage.tsx";
import {
  Tool,
  ToolCommands,
  ToolList,
} from "@/renderer/development/ToolList.tsx";

const { sdkVersion, minimumVersion, architecture, usbPort, sshHost } =
  developmentTarget;

export function BuildAndShip({ disabled }: { disabled: boolean }) {
  return (
    <Panel title="Build and ship">
      <ToolList>
        <Tool name="Terminal commands">
          <ToolCommands
            note="Create a project. Theos asks for a template and a name."
            commands={["$THEOS/bin/nic.pl"]}
          />
          <ToolCommands
            note="Target the iPad 2, in the project's Makefile above the include lines."
            commands={[
              `TARGET = iphone:clang:${sdkVersion}:${minimumVersion}`,
              `ARCHS = ${architecture}`,
            ]}
          />
          <ToolCommands
            note="Build a .deb package into the project's packages folder."
            commands={["make package"]}
          />
          <ToolCommands
            note="Or build, package and install in one go through the USB tunnel."
            commands={[
              `make package install THEOS_DEVICE_IP=${sshHost} THEOS_DEVICE_PORT=${String(usbPort)}`,
            ]}
          />
        </Tool>
        <li>
          <InstallPackage disabled={disabled} />
        </li>
      </ToolList>
    </Panel>
  );
}
