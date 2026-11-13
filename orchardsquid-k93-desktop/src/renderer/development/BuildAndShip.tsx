import { Button, DetailNote, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { type ReactNode, Suspense, use, useActionState, useId } from "react";

import type {
  PackageInstallReport,
  ProjectBuild,
  ProjectCreate,
  ProjectEdit,
  ProjectOpen,
  ProjectReading,
} from "@/bridge.ts";
import {
  developmentTarget,
  packageIdPattern,
  projectEditor,
  projectNamePattern,
  type ProjectTemplate,
  projectTemplates,
} from "@/developmentSetup.ts";
import { ConfirmButton } from "@/renderer/ConfirmButton.tsx";
import {
  followDevelopment,
  stepLabels,
  useDevelopmentProgress,
} from "@/renderer/development/progress.ts";
import {
  Tool,
  ToolDetail,
  ToolDetails,
  ToolList,
  ToolNote,
  ToolOutput,
} from "@/renderer/development/ToolList.tsx";
import { formatDateTime } from "@/renderer/format.ts";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";
import { TaskProgress } from "@/renderer/TaskProgress.tsx";
import { UnreachableNote } from "@/renderer/UnreachableNote.tsx";

const { sdkVersion, minimumVersion, architecture } = developmentTarget;
const target = `iphone:clang:${sdkVersion}:${minimumVersion}`;
const inputClassName =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 dark:border-zinc-700";

const templateNames: Record<ProjectTemplate, string> = {
  tool: "Command-line tool",
  application: "App",
  tweak: "Tweak",
  library: "Library",
};

const kindNames: Partial<Record<string, string>> = {
  tool: "Command-line tool",
  application: "App",
  tweak: "Tweak",
  library: "Library",
  framework: "Framework",
  bundle: "Bundle",
  null: "Files only",
};

type Request =
  | {
      action: "create";
      template: ProjectTemplate;
      name: string;
      packageId: string;
    }
  | { action: "open" }
  | { action: "edit" }
  | { action: "build"; install: boolean }
  | { action: "package" };

interface Failed {
  state: "error";
}

type Outcome =
  | { action: "create"; report: ProjectCreate | Failed }
  | { action: "open"; report: ProjectOpen | Failed }
  | { action: "edit"; report: ProjectEdit | Failed }
  | { action: "build"; report: ProjectBuild | Failed }
  | { action: "package"; report: PackageInstallReport | Failed }
  | null;

async function perform(
  request: Request,
  onChanged: () => Promise<unknown>,
): Promise<Outcome> {
  switch (request.action) {
    case "create": {
      const report = await window.bridge.createDevelopmentProject(
        request.template,
        request.name,
        request.packageId,
      );
      if (report.state === "created") {
        await onChanged();
      }
      return { action: "create", report };
    }
    case "open": {
      const report = await window.bridge.openDevelopmentProject();
      if (report.state === "opened") {
        await onChanged();
      }
      return { action: "open", report };
    }
    case "edit":
      return {
        action: "edit",
        report: await window.bridge.editDevelopmentProject(),
      };
    case "build": {
      const report = await followDevelopment(
        () =>
          window.bridge.buildDevelopmentProject(
            request.install ? ["install"] : [],
          ),
        { task: "build", step: "build" },
      );
      await onChanged();
      return { action: "build", report };
    }
    case "package":
      return {
        action: "package",
        report: await followDevelopment(() =>
          window.bridge.installIpadPackage(),
        ),
      };
  }
}

function readTemplate(formData: FormData): ProjectTemplate {
  const chosen = formData.get("template");
  return (
    (Object.keys(projectTemplates) as ProjectTemplate[]).find(
      (template) => template === chosen,
    ) ?? "tool"
  );
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function Problem({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="text-red-600 dark:text-red-400">
      {children}
    </div>
  );
}

function Success({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-zinc-600 dark:text-zinc-400">
      {children}
    </p>
  );
}

function describeInstalled(
  report: Extract<PackageInstallReport, { state: "installed" }>,
): string {
  const installed = [report.package ?? report.file, report.version]
    .filter(Boolean)
    .join(" ");
  return `${installed} on the iPad.${
    report.homeScreenRefreshed
      ? ""
      : " The Home screen was not refreshed, so an app's icon shows only after the iPad restarts."
  }`;
}

function PackageProblem({
  report,
}: {
  report: Exclude<PackageInstallReport, { state: "installed" | "cancelled" }>;
}) {
  if (report.state === "unreachable") {
    return <UnreachableNote connection={report.connection} />;
  }
  return (
    <Problem>
      {report.state === "signed-out" && signedOutExplanation}
      {report.state === "invalid" &&
        `${report.file} is not a .deb package this app can copy. Nothing was sent to the iPad.`}
      {report.state === "refused" && (
        <>
          The iPad did not install {report.file}. dpkg reported:
          <ToolOutput>{report.output}</ToolOutput>
        </>
      )}
    </Problem>
  );
}

function Result({ outcome }: { outcome: Outcome }) {
  if (outcome === null) {
    return null;
  }
  if (outcome.report.state === "error") {
    return <Problem>That could not be done.</Problem>;
  }
  if (outcome.report.state === "cancelled") {
    return null;
  }
  switch (outcome.action) {
    case "create": {
      const { report } = outcome;
      if (report.state === "created") {
        return <Success>Created {report.folder}.</Success>;
      }
      return (
        <Problem>
          {report.state === "exists" &&
            `${report.folder} already exists. Choose another name or folder.`}
          {report.state === "failed" && (
            <>
              The project was not created. Theos printed:
              <ToolOutput>{report.output}</ToolOutput>
            </>
          )}
        </Problem>
      );
    }
    case "open": {
      const { report } = outcome;
      return report.state === "invalid" ? (
        <Problem>
          {report.folder} is not a Theos project: it has no Makefile that
          includes Theos.
        </Problem>
      ) : null;
    }
    case "edit": {
      const { report } = outcome;
      return report.state === "opened" ? null : (
        <Problem>
          {report.state === "no-editor"
            ? `${projectEditor.name} was not found on this Mac.`
            : "There is no project to open. Create or open one first."}
        </Problem>
      );
    }
    case "build": {
      const { report } = outcome;
      if (report.state === "built") {
        const { file, install } = report;
        if (install === null || install.state === "cancelled") {
          return (
            <Success>
              Built {file} in the project&apos;s packages folder.
            </Success>
          );
        }
        if (install.state === "installed") {
          return (
            <Success>
              Built {file} and installed {describeInstalled(install)}
            </Success>
          );
        }
        return (
          <>
            <Success>Built {file}, but it was not installed.</Success>
            <PackageProblem report={install} />
          </>
        );
      }
      return (
        <Problem>
          {report.state === "busy" &&
            "Another task is still running. Try again when it has finished."}
          {report.state === "no-project" &&
            "There is no project to build. Create or open one first."}
          {report.state === "failed" && (
            <>
              The build failed. The last lines it printed:
              <ToolOutput>{report.output}</ToolOutput>
            </>
          )}
        </Problem>
      );
    }
    case "package": {
      const { report } = outcome;
      return report.state === "installed" ? (
        <Success>Installed {describeInstalled(report)}</Success>
      ) : (
        <PackageProblem report={report} />
      );
    }
  }
}

function ProjectFields() {
  const id = useId();
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <label htmlFor={`${id}-template`} className="font-medium">
          Template
        </label>
        <select
          id={`${id}-template`}
          name="template"
          defaultValue="tool"
          className={inputClassName}
        >
          {(Object.keys(projectTemplates) as ProjectTemplate[]).map(
            (template) => (
              <option key={template} value={template}>
                {templateNames[template]}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="font-medium">
          Name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          pattern={projectNamePattern}
          maxLength={64}
          placeholder="Browser"
          autoComplete="off"
          spellCheck={false}
          className={`${inputClassName} font-mono`}
        />
        <DetailNote>
          The folder and the program are named after it. Letters, digits, plus,
          dot and hyphen.
        </DetailNote>
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-package`} className="font-medium">
          Package ID
        </label>
        <input
          id={`${id}-package`}
          name="package"
          required
          pattern={packageIdPattern}
          maxLength={128}
          placeholder="com.example.browser"
          autoComplete="off"
          spellCheck={false}
          className={`${inputClassName} font-mono`}
        />
        <DetailNote>
          What dpkg knows the package as. Lowercase letters, digits, plus, dot
          and hyphen.
        </DetailNote>
      </div>
    </div>
  );
}

function InstallOption() {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        name="install"
        defaultChecked
        className="mt-0.5 size-4 shrink-0 accent-emerald-600"
      />
      <label htmlFor={id}>
        <span className="font-medium">Install it on the iPad</span>
        <DetailNote>
          Copies the package to /private/var/tmp on the iPad, installs it there
          with dpkg as root, deletes the copy and refreshes the Home screen.
        </DetailNote>
      </label>
    </div>
  );
}

function Project({
  reading,
  disabled,
  building,
  onBuild,
}: {
  reading: ProjectReading | null;
  disabled: boolean;
  building: boolean;
  onBuild: (install: boolean) => void;
}) {
  if (reading === null || reading.state === "none") {
    return (
      <Tool name="Project" value={reading ? "None open" : "Not readable"} />
    );
  }
  if (reading.state === "missing") {
    return (
      <Tool name="Project" ready={false} value="Folder not found" defaultOpen>
        <ToolNote>
          {reading.folder} is gone, or no longer holds a Makefile that includes
          Theos. Open the project again, or create a new one.
        </ToolNote>
      </Tool>
    );
  }
  const { project } = reading;
  const targetsIpad =
    project.target === target && project.architectures === architecture;
  return (
    <Tool
      name="Project"
      ready
      value={project.name}
      action={
        <ConfirmButton
          label={building ? "Building…" : "Build"}
          title={`Build ${project.name}`}
          disabled={disabled}
          action={(formData) => {
            onBuild(formData.get("install") !== null);
          }}
          fields={<InstallOption />}
        >
          Runs make package in {project.folder} for iOS {sdkVersion} on{" "}
          {architecture}. That compiles the project, signs it with ldid and
          wraps it in a .deb file in its packages folder.
        </ConfirmButton>
      }
    >
      {!targetsIpad && (
        <ToolNote>
          Build uses {target} and {architecture}, whatever the Makefile names.
        </ToolNote>
      )}
      <ToolDetails>
        <ToolDetail label="Folder" mono>
          {project.folder}
        </ToolDetail>
        {project.kind && (
          <ToolDetail label="Kind">
            {kindNames[project.kind] ?? project.kind}
          </ToolDetail>
        )}
        {project.package && (
          <ToolDetail label="Package" mono>
            {project.package}
          </ToolDetail>
        )}
        {project.version && (
          <ToolDetail label="Version" mono>
            {project.version}
          </ToolDetail>
        )}
        <ToolDetail label="Target" mono>
          {project.target ?? "Not set"}
        </ToolDetail>
        <ToolDetail label="Architectures" mono>
          {project.architectures ?? "Not set"}
        </ToolDetail>
        <ToolDetail label="Last package">
          {project.latestPackage ? (
            <>
              <span className="font-mono">{project.latestPackage.file}</span>,{" "}
              {formatDateTime(project.latestPackage.builtAt)}
            </>
          ) : (
            "None built yet"
          )}
        </ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

function Actions({
  check,
  disabled,
  onChanged,
}: {
  check: Promise<ProjectReading | null>;
  disabled: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const reading = use(check);
  const [outcome, run, isBusy] = useActionState(
    async (_previous: Outcome, request: Request): Promise<Outcome> => {
      try {
        return await perform(request, onChanged);
      } catch (error) {
        console.error("The project request failed", error);
        return { action: request.action, report: { state: "error" } };
      }
    },
    null,
  );
  const progress = useDevelopmentProgress();
  const shown =
    progress?.task === "build" || progress?.task === "package"
      ? progress
      : null;
  const busy = disabled || isBusy;

  return (
    <ToolList>
      <Project
        reading={reading}
        disabled={busy}
        building={progress?.task === "build"}
        onBuild={(install) => {
          run({ action: "build", install });
        }}
      />
      <li className="flex flex-col items-start gap-2 py-2.5">
        <div className="flex flex-wrap gap-2">
          <form
            action={() => {
              run({ action: "edit" });
            }}
          >
            <Button type="submit" disabled={busy || reading?.state !== "open"}>
              Open in {projectEditor.name}
            </Button>
          </form>
          <ConfirmButton
            label="New project…"
            title="New project"
            disabled={busy}
            action={(formData) => {
              run({
                action: "create",
                template: readTemplate(formData),
                name: readText(formData, "name"),
                packageId: readText(formData, "package"),
              });
            }}
            fields={<ProjectFields />}
          >
            Creates a Theos project from the template, in a folder you choose
            next, and sets its Makefile to build for iOS {sdkVersion} on{" "}
            {architecture}. It becomes the project that Build builds.
          </ConfirmButton>
          <ConfirmButton
            label="Open project…"
            title="Open project"
            disabled={busy}
            action={() => {
              run({ action: "open" });
            }}
          >
            Asks for the folder of a Theos project you already have, and makes
            it the project that Build builds.
          </ConfirmButton>
          <ConfirmButton
            label="Install package…"
            title="Install package"
            disabled={busy}
            action={() => {
              run({ action: "package" });
            }}
          >
            Asks for a .deb file on this Mac, copies it to /private/var/tmp on
            the iPad, installs it there with dpkg as root, deletes the copy and
            refreshes the Home screen.
          </ConfirmButton>
        </div>
        {shown ? (
          <TaskProgress
            label="Build and ship progress"
            step={stepLabels[shown.step]}
            item={shown.item}
            fraction={shown.fraction}
            seconds={shown.seconds}
          />
        ) : (
          <Result outcome={isBusy ? null : outcome} />
        )}
      </li>
    </ToolList>
  );
}

export function BuildAndShip(props: {
  check: Promise<ProjectReading | null>;
  disabled: boolean;
  onChanged: () => Promise<unknown>;
}) {
  return (
    <Panel title="Build and ship">
      <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
        <Actions {...props} />
      </Suspense>
    </Panel>
  );
}
