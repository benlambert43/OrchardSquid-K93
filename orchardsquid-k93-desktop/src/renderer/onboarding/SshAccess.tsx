import { PanelNote } from "@orchardsquid-k93/ui";

import type { IpadOnboarding } from "@/bridge.ts";
import { pageLinks } from "@/renderer/navigation.ts";
import { type Step, type StepGroup, StepList } from "@/renderer/StepList.tsx";
import { describeUnreachable } from "@/unreachable.ts";

const keyFile = "~/.ssh/orchardsquid-k93";
const createKeyCommand = `ssh-keygen -t ed25519 -N "" -C "OrchardSquid-K93" -f ${keyFile}`;
const passwordAccounts = ["root", "mobile"];

function authorizeCommand(authorizedKey: string): string {
  return `mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '${authorizedKey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`;
}

function ipadStep({ connection, sshPort }: IpadOnboarding): Step {
  if (connection.transport === "usb") {
    const label = "iPad over USB";
    return sshPort === "absent"
      ? { label, state: "todo", detail: describeUnreachable(connection) }
      : {
          label,
          state: "done",
          detail: "The iPad 2 is attached with its USB cable.",
        };
  }
  const label = "Wi-Fi address";
  return connection.address === null
    ? { label, state: "todo", detail: describeUnreachable(connection) }
    : {
        label,
        state: "done",
        detail: `The app looks for the iPad at ${connection.address}.`,
      };
}

function serverStep({ connection, sshPort }: IpadOnboarding): Step {
  const label = "OpenSSH on the iPad";
  switch (sshPort) {
    case "open":
      return {
        label,
        state: "done",
        detail: "The iPad's SSH server answers on port 22.",
      };
    case "closed":
      return {
        label,
        state: "todo",
        detail:
          connection.transport === "usb"
            ? "Nothing answers on port 22. On the iPad, open Cydia, search for OpenSSH and install it."
            : `${describeUnreachable(connection)} Check that it is awake and on the same network as this computer, and that OpenSSH is installed from Cydia.`,
      };
    case "absent":
      return {
        label,
        state: "todo",
        detail: "Checked once the iPad can be reached.",
      };
  }
}

function keyStep({ authorizedKey }: IpadOnboarding): Step {
  const label = "This computer's key";
  return authorizedKey === null
    ? {
        label,
        state: "todo",
        detail: `There is no key at ${keyFile}. Run the command above in Terminal on this Mac to create one, or restore an SSH backup on the Settings page.`,
        command: createKeyCommand,
      }
    : {
        label,
        state: "done",
        detail: `${keyFile} holds the key this app signs in with.`,
      };
}

function accessStep({
  sshPort,
  authorizedKey,
  signedIn,
}: IpadOnboarding): Step {
  const label = "Key added to the iPad";
  if (signedIn) {
    return {
      label,
      state: "done",
      detail: "The iPad signs this computer in as root with the key.",
    };
  }
  if (sshPort !== "open") {
    return {
      label,
      state: "todo",
      detail: "Checked once the iPad's SSH server answers.",
    };
  }
  if (authorizedKey === null) {
    return { label, state: "todo", detail: "Create the key first." };
  }
  return {
    label,
    state: "todo",
    detail:
      "The iPad does not accept the key yet. Open the Shell page, sign in with the iPad's root password, and run the command above there. It adds the key to root's authorized keys.",
    command: authorizeCommand(authorizedKey),
  };
}

function passwordStep(
  { signedIn, defaultPasswordAccounts }: IpadOnboarding,
  account: string,
): Step {
  const label = `Password for ${account}`;
  if (!signedIn) {
    return {
      label,
      state: "todo",
      detail: "Checked once the iPad accepts the key.",
    };
  }
  return defaultPasswordAccounts.includes(account)
    ? {
        label,
        state: "todo",
        detail:
          "Still the factory default, which is public. Run the command above on the Shell page to change it.",
        command: `passwd ${account}`,
      }
    : { label, state: "done", detail: "Changed from the factory default." };
}

function buildGroups(onboarding: IpadOnboarding): StepGroup[] {
  return [
    {
      title: "Reach the iPad",
      steps: [ipadStep(onboarding), serverStep(onboarding)],
    },
    {
      title: "Sign in with a key",
      steps: [keyStep(onboarding), accessStep(onboarding)],
    },
    {
      title: "Passwords",
      steps: passwordAccounts.map((account) =>
        passwordStep(onboarding, account),
      ),
    },
  ];
}

export function SshAccess({ onboarding }: { onboarding: IpadOnboarding }) {
  return (
    <>
      <PanelNote>
        These steps start from User Default: an iPad 2 reset to factory
        settings, jailbroken with Carbon, with the iocaste untether and OpenSSH
        installed from Cydia.
      </PanelNote>
      <StepList groups={buildGroups(onboarding)} />
      {onboarding.complete ? (
        <PanelNote>
          Every step was done the last time the iPad answered, so this page is
          no longer in the sidebar. It is linked from the{" "}
          <a href={pageLinks.settings} className="underline underline-offset-2">
            Settings page
          </a>
          .
        </PanelNote>
      ) : (
        <PanelNote>
          The Shell page asks for the root password until the key is added.
          Refresh this page after each step.
        </PanelNote>
      )}
    </>
  );
}
