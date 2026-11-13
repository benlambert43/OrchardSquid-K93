import { Button } from "@orchardsquid-k93/ui";
import { useActionState } from "react";

import type {
  SshHost,
  SshHostTest,
  UsbTunnel as Tunnel,
  UsbTunnelStart,
} from "@/bridge.ts";
import { Command } from "@/renderer/Command.tsx";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import {
  Tool,
  ToolDetail,
  ToolDetails,
  ToolList,
  ToolNote,
  ToolOutput,
} from "@/renderer/development/ToolList.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

const address = "127.0.0.1";

export interface TunnelReading {
  tunnel: Tunnel;
  host: SshHost;
}

interface Changing {
  disabled: boolean;
  onChanged: () => Promise<unknown>;
}

type StartOutcome = UsbTunnelStart | { state: "failed" } | null;

type TestOutcome = SshHostTest | { state: "error" } | null;

function StartResult({
  tunnel,
  outcome,
}: {
  tunnel: Tunnel;
  outcome: StartOutcome;
}) {
  if (outcome === null || outcome.state === "started") {
    return null;
  }
  if (outcome.state === "unreachable") {
    return (
      <div role="status" className="mt-2">
        <UnreachableNote connection={outcome.connection} />
      </div>
    );
  }
  return (
    <p role="status" className="mt-2 text-red-600 dark:text-red-400">
      {outcome.state === "port-in-use"
        ? `Another program on this Mac is already using port ${String(tunnel.port)}. Quit it, then start the tunnel again.`
        : "The tunnel could not be started."}
    </p>
  );
}

function TunnelRow({
  tunnel,
  disabled,
  onChanged,
}: Changing & { tunnel: Tunnel }) {
  const [outcome, toggle, isBusy] = useActionState(
    async (): Promise<StartOutcome> => {
      try {
        if (tunnel.running) {
          await window.bridge.stopUsbTunnel();
          await onChanged();
          return null;
        }
        const started = await window.bridge.startUsbTunnel();
        if (started.state === "started") {
          await onChanged();
        }
        return started;
      } catch (error) {
        console.error("The USB tunnel request failed", error);
        return { state: "failed" };
      }
    },
    null,
  );
  const port = String(tunnel.port);

  if (!tunnel.running) {
    return (
      <Tool
        name="Tunnel"
        ready={false}
        action={
          <ConfirmButton
            label={isBusy ? "Starting…" : "Start tunnel"}
            title="Start tunnel"
            disabled={disabled || isBusy}
            action={toggle}
          >
            Listens on port {port} of this Mac, for programs on this Mac only,
            and passes each connection to the iPad&apos;s SSH server over the
            USB cable. It runs until you stop it or quit the app.
          </ConfirmButton>
        }
        status={
          <StartResult tunnel={tunnel} outcome={isBusy ? null : outcome} />
        }
      />
    );
  }
  return (
    <Tool
      name="Tunnel"
      ready={tunnel.attached}
      value={`${address}:${port}`}
      defaultOpen={!tunnel.attached}
      action={
        <form action={toggle}>
          <Button type="submit" disabled={disabled || isBusy}>
            Stop
          </Button>
        </form>
      }
    >
      <ToolDetails>
        <ToolDetail label="Listens on">
          {address}, port {port}, for programs on this Mac only
        </ToolDetail>
        <ToolDetail label="Forwards to">
          The iPad&apos;s SSH server, port 22, over the USB cable
        </ToolDetail>
        <ToolDetail label="iPad">
          {tunnel.attached
            ? "Attached by USB"
            : "Not attached, so connections are refused until it is"}
        </ToolDetail>
        <ToolDetail label="Runs until">You stop it or quit the app</ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

function TestResult({
  reading: { tunnel, host },
  outcome,
}: {
  reading: TunnelReading;
  outcome: TestOutcome;
}) {
  if (outcome === null) {
    return null;
  }
  if (outcome.state === "connected") {
    return (
      <p role="status" className="mt-2 text-zinc-600 dark:text-zinc-400">
        ssh {host.name} reached the iPad, which answered {outcome.machine}.
      </p>
    );
  }
  if (outcome.state === "host-key-changed") {
    return (
      <div role="status" className="mt-2">
        <p className="text-red-600 dark:text-red-400">
          The iPad&apos;s host key is not the one this Mac has on record for the
          tunnel, which happens after the iPad is reset. Remove the old one in
          Terminal, then test again:
        </p>
        <Command>{`ssh-keygen -R "${outcome.knownHost}"`}</Command>
      </div>
    );
  }
  return (
    <div role="status" className="mt-2 text-red-600 dark:text-red-400">
      ssh {host.name} did not reach the iPad.
      {!tunnel.running && " The tunnel is not running."}
      {outcome.state === "failed" && outcome.output && (
        <ToolOutput>{outcome.output}</ToolOutput>
      )}
    </div>
  );
}

function HostRow({
  reading,
  disabled,
  onChanged,
}: Changing & { reading: TunnelReading }) {
  const { host } = reading;
  const [addFailed, add, isAdding] = useActionState(async () => {
    try {
      await window.bridge.addSshHost();
      await onChanged();
      return false;
    } catch (error) {
      console.error("The SSH host could not be added", error);
      return true;
    }
  }, false);
  const [tested, test, isTesting] = useActionState(
    async (): Promise<TestOutcome> => {
      try {
        return await window.bridge.testSshHost();
      } catch (error) {
        console.error("The SSH host could not be tested", error);
        return { state: "error" };
      }
    },
    null,
  );

  if (host.options === null) {
    return (
      <Tool
        name="SSH host"
        ready={false}
        action={
          <ConfirmButton
            label="Add SSH host"
            title="Add SSH host"
            disabled={disabled || isAdding}
            action={add}
          >
            Adds an entry named {host.name} to {host.file}. It points at the
            tunnel on port {String(reading.tunnel.port)}, signs in as root with
            this app&apos;s key, and allows the older host key the iPad&apos;s
            OpenSSH offers. ssh, scp and Theos can then reach the iPad as{" "}
            {host.name}.
          </ConfirmButton>
        }
        status={
          addFailed &&
          !isAdding && (
            <p role="status" className="mt-2 text-red-600 dark:text-red-400">
              The entry could not be added to {host.file}.
            </p>
          )
        }
      />
    );
  }
  return (
    <Tool
      name="SSH host"
      ready={host.pointsAtTunnel}
      value={host.name}
      defaultOpen={!host.pointsAtTunnel}
      action={
        <ConfirmButton
          label={isTesting ? "Testing…" : "Test"}
          title="Test SSH host"
          disabled={disabled || isTesting}
          action={test}
        >
          Runs ssh {host.name} on this Mac, the way Terminal would, and asks the
          iPad for its model. The first time, SSH records the iPad&apos;s host
          key for this address in ~/.ssh/known_hosts.
        </ConfirmButton>
      }
      status={
        <TestResult reading={reading} outcome={isTesting ? null : tested} />
      }
    >
      {!host.pointsAtTunnel && (
        <ToolNote>
          This entry does not point at the tunnel, which is {address} on port{" "}
          {String(reading.tunnel.port)}. Change it in {host.file}.
        </ToolNote>
      )}
      <ToolDetails>
        <ToolDetail label="File" mono>
          {host.file}
        </ToolDetail>
        {host.options.map(({ name, value }, index) => (
          <ToolDetail key={`${name}-${String(index)}`} label={name} mono>
            {value}
          </ToolDetail>
        ))}
      </ToolDetails>
    </Tool>
  );
}

export function UsbTunnel({
  reading,
  ...changing
}: Changing & { reading: TunnelReading }) {
  return (
    <ToolList>
      <TunnelRow tunnel={reading.tunnel} {...changing} />
      <HostRow reading={reading} {...changing} />
    </ToolList>
  );
}
