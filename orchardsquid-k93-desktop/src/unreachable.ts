import type { Connection, Transport } from "@/bridge.ts";

export const transportNames: Record<Transport, string> = {
  wifi: "Wi-Fi",
  usb: "USB",
};

export function describeUnreachable(connection: Connection): string {
  if (connection.transport === "usb") {
    return "Connect the iPad 2 with its USB cable.";
  }
  return connection.address === null
    ? "The iPad's Wi-Fi address is not known yet. Enter it on the Settings page."
    : `The iPad did not answer at ${connection.address} over Wi-Fi.`;
}
