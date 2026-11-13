import { DetailNote, PanelNote } from "@orchardsquid-k93/ui";

import type { IpadPackage, IpadSoftware } from "@/bridge.ts";
import { formatBytes, formatNumber } from "@/renderer/format.ts";

const firstSection = "Development";
const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

function sectionName(section: string): string {
  return section ? section.replaceAll("_", " ") : "No section";
}

function groupBySection(packages: IpadPackage[]): [string, IpadPackage[]][] {
  return [...Map.groupBy(packages, ({ section }) => section)].toSorted(
    ([a], [b]) =>
      Number(b === firstSection) - Number(a === firstSection) ||
      a.localeCompare(b),
  );
}

function LeftOut({ software }: { software: IpadSoftware }) {
  const { userDefaultPackages, generatedPackages } = software;
  const leftOut: string[] = [];
  if (userDefaultPackages > 0) {
    leftOut.push(
      `${formatNumber(userDefaultPackages)} ${
        userDefaultPackages === 1 ? "package that is" : "packages that are"
      } part of User Default`,
    );
  }
  if (generatedPackages > 0) {
    leftOut.push(
      `${formatNumber(generatedPackages)} entries that Cydia generates to describe the iPad itself`,
    );
  }
  return (
    leftOut.length > 0 && (
      <PanelNote>Left out: {listFormat.format(leftOut)}.</PanelNote>
    )
  );
}

export function PackageTable({ software }: { software: IpadSoftware }) {
  if (software.packages.length === 0) {
    return (
      <>
        <PanelNote>
          Nothing has been installed on top of User Default yet.
        </PanelNote>
        <LeftOut software={software} />
      </>
    );
  }
  return (
    <>
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-zinc-600 dark:text-zinc-400">
            <th scope="col" className="pb-1 font-medium">
              Package
            </th>
            <th scope="col" className="pb-1 pl-6 font-medium">
              Version
            </th>
            <th
              scope="col"
              className="hidden pb-1 pl-6 text-right font-medium @md:table-cell"
            >
              Size
            </th>
          </tr>
        </thead>
        {groupBySection(software.packages).map(([section, packages]) => (
          <tbody key={section}>
            <tr>
              <th
                colSpan={3}
                scope="rowgroup"
                className="pt-5 pb-1.5 text-xs font-semibold tracking-wide
                  text-zinc-500 uppercase"
              >
                {sectionName(section)}
              </th>
            </tr>
            {packages.map(({ id, version, summary, installedBytes }) => (
              <tr
                key={id}
                className="border-t border-zinc-200 align-top
                  dark:border-zinc-800"
              >
                <th scope="row" className="py-2.5 font-medium wrap-anywhere">
                  {id}
                  <DetailNote>{summary}</DetailNote>
                </th>
                <td className="py-2.5 pl-6 font-mono whitespace-nowrap">
                  {version}
                </td>
                <td
                  className="hidden py-2.5 pl-6 text-right whitespace-nowrap
                    text-zinc-600 @md:table-cell dark:text-zinc-400"
                >
                  {installedBytes === null ? "" : formatBytes(installedBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <LeftOut software={software} />
    </>
  );
}
