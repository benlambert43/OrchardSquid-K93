import type { Connection, IpadDevelopment } from "@/bridge.ts";
import {
  Tool,
  ToolDetail,
  ToolDetails,
  ToolList,
  ToolNote,
} from "@/renderer/development/ToolList.tsx";
import { formatNumber } from "@/renderer/format.ts";
import { transportNames } from "@/unreachable.ts";

const missing = "Not found";

function describeConnection(connection: Connection): string {
  const transport = transportNames[connection.transport];
  return connection.transport === "wifi" && connection.address
    ? `${transport}, at ${connection.address}`
    : transport;
}

export function IpadTools({ development }: { development: IpadDevelopment }) {
  const { connection, openssh, dpkg } = development;
  return (
    <ToolList>
      <Tool
        name="OpenSSH"
        ready={openssh.version !== null}
        value={openssh.version ?? missing}
      >
        <ToolNote>Receives the packages this Mac builds.</ToolNote>
        <ToolDetails>
          <ToolDetail label="Reached over">
            {describeConnection(connection)}
          </ToolDetail>
          {openssh.port !== null && (
            <ToolDetail label="Port">{openssh.port}</ToolDetail>
          )}
          <ToolDetail label="Signed in as">
            root, with this computer&apos;s key
          </ToolDetail>
          <ToolDetail label="Authorized keys">
            {formatNumber(openssh.authorizedKeys)}
          </ToolDetail>
          {openssh.passwordSignIn !== null && (
            <ToolDetail label="Passwords">
              {openssh.passwordSignIn ? "Accepted as well" : "Not accepted"}
            </ToolDetail>
          )}
        </ToolDetails>
      </Tool>
      <Tool
        name="dpkg"
        ready={dpkg.version !== null}
        value={dpkg.version ?? missing}
      >
        <ToolNote>Installs the packages once they are on the iPad.</ToolNote>
        <ToolDetails>
          <ToolDetail label="Architecture" mono>
            {dpkg.architecture ?? missing}
          </ToolDetail>
        </ToolDetails>
      </Tool>
    </ToolList>
  );
}
