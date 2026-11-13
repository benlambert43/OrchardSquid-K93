import { DetailNote, PanelNote } from "@orchardsquid-k93/ui";

import type { AppAction } from "@/appActions.ts";
import type { IpadApp } from "@/bridge.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import { formatBytes } from "@/renderer/format.ts";

const stash = "/private/var/stash/OrchardSquid/RemovedApps";
const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

export interface AppRequest {
  app: IpadApp;
  action: AppAction;
}

interface AppTableProps {
  apps: IpadApp[];
  empty: string;
  disabled: boolean;
  onRequest: (request: AppRequest) => void;
}

function describeSource({ id, package: owner }: IpadApp): string {
  return owner === null ? id : `${id}, from the package ${owner}`;
}

function AppButton({
  app,
  disabled,
  onRequest,
}: Pick<AppTableProps, "disabled" | "onRequest"> & { app: IpadApp }) {
  const request = (action: AppAction) => () => {
    onRequest({ app, action });
  };
  if (app.removed) {
    return (
      <ConfirmButton
        label="Restore"
        title={`Restore ${app.name}`}
        disabled={disabled}
        action={request("restore")}
      >
        Moves {app.name} from {stash} back to /Applications, puts back the links
        and launch daemons that were set aside with it, and refreshes the Home
        screen.
      </ConfirmButton>
    );
  }
  if (app.package !== null) {
    return (
      <ConfirmButton
        label="Uninstall"
        title={`Uninstall ${app.name}`}
        disabled={disabled}
        action={request("uninstall")}
      >
        Removes the package {app.package} with dpkg, which takes {app.name} off
        the iPad, deletes links that still point into it, and refreshes the Home
        screen. Installing the package again brings it back.
      </ConfirmButton>
    );
  }
  return (
    app.removable && (
      <ConfirmButton
        label="Remove"
        title={`Remove ${app.name}`}
        disabled={disabled}
        action={request("remove")}
      >
        Moves {app.name} from /Applications to {stash} on the data volume and
        refreshes the Home screen. Links that point into it are removed
        {app.services.length > 0 &&
          `, and the launch daemons that run from inside it (${listFormat.format(app.services)}) are stopped and set aside`}
        . Restore puts all of it back.
      </ConfirmButton>
    )
  );
}

export function AppTable({ apps, empty, disabled, onRequest }: AppTableProps) {
  if (apps.length === 0) {
    return <PanelNote>{empty}</PanelNote>;
  }
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-xs text-zinc-600 dark:text-zinc-400">
          <th scope="col" className="pb-1 font-medium">
            App
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
          <th scope="col" className="pb-1 pl-6">
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {apps.map((app) => (
          <tr
            key={app.id}
            className="border-t border-zinc-200 align-top dark:border-zinc-800"
          >
            <th scope="row" className="py-2.5 font-medium wrap-anywhere">
              {app.name}
              <DetailNote>{describeSource(app)}</DetailNote>
            </th>
            <td className="py-2.5 pl-6 font-mono whitespace-nowrap">
              {app.version}
            </td>
            <td
              className="hidden py-2.5 pl-6 text-right whitespace-nowrap
                text-zinc-600 @md:table-cell dark:text-zinc-400"
            >
              {formatBytes(app.bytes)}
            </td>
            <td className="py-1.5 pl-6 text-right">
              <AppButton app={app} disabled={disabled} onRequest={onRequest} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
