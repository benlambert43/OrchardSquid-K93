import { Panel, PanelNote } from "@orchardsquid-k93/ui";
import { use } from "react";

import type { IpadOffer, IpadSoftware } from "@/bridge.ts";
import { developerPackages } from "@/developerSetup.ts";
import type { Check } from "@/renderer/ReportPanel.tsx";
import { type NumberedStep, NumberedSteps } from "@/renderer/NumberedSteps.tsx";

const aptMethod = "/usr/lib/apt/methods/http";
const downloadFolder = "/tmp";

interface Download {
  id: string;
  file: string;
  offer: IpadOffer & { url: string; md5: string };
}

function findDownload(software: IpadSoftware, id: string): Download | null {
  const offer = software.developerSetup.offers[id]?.find(
    (candidate): candidate is Download["offer"] =>
      candidate.url !== null && candidate.md5 !== null,
  );
  return offer ? { id, file: `${downloadFolder}/${id}.deb`, offer } : null;
}

function findDownloads(software: IpadSoftware): Download[] | null {
  const downloads = developerPackages.aptGetBootstrap
    .filter((id) => !software.packages.some((listing) => listing.id === id))
    .map((id) => findDownload(software, id));
  return downloads.every((download) => download !== null) ? downloads : null;
}

function downloadStep({ id, file, offer }: Download): NumberedStep {
  return {
    title: `Download ${id} ${offer.version}`,
    command: String.raw`printf '600 URI Acquire\nURI: ${offer.url}\nFilename: ${file}\n\n' | ${aptMethod}`,
    explanation: `The iPad has no curl or wget yet, but Cydia keeps apt's own download helper at ${aptMethod}. The helper reads requests on its input, so printf writes one asking for ${offer.url} to be saved as ${file}. It reports as it goes and prints "201 URI Done" when the file is saved.`,
  };
}

function checkStep({ id, file, offer }: Download): NumberedStep {
  const name = `${id}.deb`;
  return {
    title: `Check ${name}`,
    command: `[ "$(openssl md5 < ${file})" = "${offer.md5}" ] && echo "${name} matches" || echo "${name} does not match"`,
    explanation: `${offer.source} serves this file over plain HTTP, so anything on the way could change it. openssl works out the file's MD5 checksum and compares it with the one in Cydia's catalogue. If it prints "does not match", delete the file and stop here.`,
  };
}

function buildSteps(downloads: Download[]): NumberedStep[] {
  const files = downloads.map(({ file }) => file).join(" ");
  return [
    ...downloads.flatMap((download) => [
      downloadStep(download),
      checkStep(download),
    ]),
    {
      title: "Install the packages",
      command: `dpkg -i ${files}`,
      explanation:
        "dpkg unpacks and sets up the packages. Installing them in one command lets dpkg set up the dependencies before apt7, which needs them. apt7 puts apt-get in /usr/bin.",
    },
    {
      title: "Delete the downloads",
      command: `rm ${files}`,
      explanation:
        "Once they are installed, the .deb files are no longer needed.",
    },
    {
      title: "Load the package lists",
      command: "apt-get update",
      explanation:
        "apt-get keeps its own copy of the package lists, separate from Cydia's, and it starts empty. This fetches them from the sources in /etc/apt/sources.list.d, so apt-get install can find packages. Run it again whenever you add a source.",
    },
  ];
}

export function AptGetSetup({
  check,
}: {
  check: Promise<Check<IpadSoftware>>;
}) {
  const loaded = use(check);
  if (loaded.state !== "ok" || loaded.reading.developerSetup.aptGet) {
    return null;
  }
  const downloads = findDownloads(loaded.reading);

  return (
    <Panel title="apt-get">
      <PanelNote>
        apt-get is not installed yet, and most developer dependencies are
        installed with it. Run these commands in the Shell tab, one at a time
        and in order.
      </PanelNote>
      {downloads ? (
        <NumberedSteps steps={buildSteps(downloads)} />
      ) : (
        <PanelNote>
          Cydia&apos;s catalogue does not list a download for apt7 or one of the
          packages it needs. Refresh the sources in Cydia, then refresh this
          page.
        </PanelNote>
      )}
    </Panel>
  );
}
