import { Detail, DetailList } from "@orchardsquid-k93/ui";

import type { IpadSystem } from "@/bridge.ts";
import { Unavailable } from "@/renderer/dashboard/Unavailable.tsx";

const missing = "Not found";

export function SoftwareDetails({ system }: { system: IpadSystem }) {
  const { software } = system;
  if (!software) {
    return <Unavailable />;
  }
  return (
    <DetailList>
      <Detail label="Jailbreak">
        {software.carbon ? `Carbon ${software.carbon}` : missing}
      </Detail>
      <Detail label="Untether">{software.iocaste ? "iocaste" : missing}</Detail>
      <Detail label="Cydia">{software.cydia ?? missing}</Detail>
      <Detail label="OpenSSH">{software.openssh ?? missing}</Detail>
      <Detail label="OpenSSL">{software.openssl ?? missing}</Detail>
      <Detail label="Safari">{software.safari ?? missing}</Detail>
      <Detail label="WebKit">{software.webkit ?? missing}</Detail>
      <Detail label="Packages">{software.packages}</Detail>
    </DetailList>
  );
}
