import { Detail, DetailList } from "@orchardsquid-k93/ui";

import type { IpadSystem } from "@/bridge.ts";
import { Unavailable } from "@/renderer/ReportPanel.tsx";
import { formatBitRate } from "@/renderer/format.ts";

const lastChannelAt2GHz = 14;

function Address({ children }: { children: string | null }) {
  return children ? <span className="font-mono">{children}</span> : "None";
}

export function NetworkDetails({ system }: { system: IpadSystem }) {
  const { network } = system;
  if (!network) {
    return <Unavailable />;
  }
  const { wifi } = network;
  return (
    <DetailList>
      <Detail label="Wi-Fi">{wifi ? wifi.name : "Not connected"}</Detail>
      {wifi && (
        <>
          <Detail label="Signal">{wifi.signalDbm} dBm</Detail>
          <Detail label="Channel">
            {wifi.channel} (
            {wifi.channel > lastChannelAt2GHz ? "5 GHz" : "2.4 GHz"})
          </Detail>
          <Detail label="Link rate">{formatBitRate(wifi.rateMbps)}</Detail>
        </>
      )}
      <Detail label="IP address">
        <Address>{network.address}</Address>
      </Detail>
      <Detail label="Router">
        <Address>{network.router}</Address>
      </Detail>
      <Detail label="DNS">
        <Address>{network.dnsServers.join(", ") || null}</Address>
      </Detail>
    </DetailList>
  );
}
