import type {
  LaptopTool,
  LaptopToolchain,
  SdkTool,
  TheosTool,
  XcodeTool,
} from "@/bridge.ts";
import { developmentTarget, type LaptopToolName } from "@/developmentSetup.ts";
import { InstallTool } from "@/renderer/development/InstallTool.tsx";
import {
  Tool,
  ToolCommands,
  ToolDetail,
  ToolDetails,
  ToolList,
  ToolNote,
} from "@/renderer/development/ToolList.tsx";
import { formatDate } from "@/renderer/format.ts";

const { sdk: sdkName, sdkVersion, architecture } = developmentTarget;
const sdkLabel = `iOS ${sdkVersion} SDK`;
const homebrewInstaller =
  '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

interface Installing {
  disabled: boolean;
  onInstalled: () => Promise<unknown>;
}

function Xcode({ xcode }: { xcode: XcodeTool | null }) {
  if (!xcode) {
    return (
      <Tool name="Xcode" ready={false} value="Not installed" defaultOpen>
        <ToolNote>
          Install Xcode from the App Store and open it once. Theos needs the
          full Xcode, not only the Command Line Tools.
        </ToolNote>
      </Tool>
    );
  }
  if (!xcode.full) {
    return (
      <Tool
        name="Xcode"
        ready={false}
        value="Command Line Tools only"
        defaultOpen
      >
        <ToolCommands
          note="Theos needs the full Xcode. Install it from the App Store, then select it in Terminal:"
          commands={["sudo xcode-select -s /Applications/Xcode.app"]}
        />
        <ToolDetails>
          <ToolDetail label="Developer folder" mono>
            {xcode.folder}
          </ToolDetail>
        </ToolDetails>
      </Tool>
    );
  }
  return (
    <Tool
      name="Xcode"
      ready={xcode.armv7}
      value={xcode.version ?? "Installed"}
      defaultOpen={!xcode.armv7}
    >
      <ToolDetails>
        <ToolDetail label="Developer folder" mono>
          {xcode.folder}
        </ToolDetail>
        {xcode.build && (
          <ToolDetail label="Build" mono>
            {xcode.build}
          </ToolDetail>
        )}
        {xcode.compiler && (
          <ToolDetail label="Compiler">{xcode.compiler}</ToolDetail>
        )}
        {xcode.linker && <ToolDetail label="Linker">{xcode.linker}</ToolDetail>}
        <ToolDetail label={architecture}>
          {xcode.armv7
            ? `Compiled and linked by this Xcode. Its own iOS SDK has no ${architecture} libraries, so builds link against the ${sdkLabel}.`
            : "This Xcode's linker does not list it, so it cannot build for the iPad 2."}
        </ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

function Homebrew({ homebrew }: { homebrew: LaptopTool | null }) {
  if (!homebrew) {
    return (
      <Tool name="Homebrew" ready={false} value="Not installed" defaultOpen>
        <ToolCommands
          note="Theos gets ldid and xz from Homebrew. Its installer asks for this computer's password, so run it in Terminal:"
          commands={[homebrewInstaller]}
        />
      </Tool>
    );
  }
  return (
    <Tool name="Homebrew" ready value={homebrew.version ?? "Installed"}>
      <ToolNote>Installs ldid and xz, which Theos needs beside Xcode.</ToolNote>
      <ToolDetails>
        <ToolDetail label="Location" mono>
          {homebrew.file}
        </ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

function Theos({
  toolchain: { theos, xcode },
  disabled,
  onInstalled,
}: Installing & { toolchain: LaptopToolchain }) {
  if (theos.state === "occupied") {
    return (
      <Tool name="Theos" ready={false} value="Folder in use" defaultOpen>
        <ToolNote>
          {theos.folder} already holds something that is not Theos. Move it
          away, then refresh this page.
        </ToolNote>
      </Tool>
    );
  }
  if (theos.state === "absent") {
    return (
      <InstallTool
        tool="theos"
        name="Theos"
        label="Install Theos"
        disabled={disabled || !xcode?.full}
        onInstalled={onInstalled}
      >
        Clones Theos and its submodules from github.com/theos/theos into{" "}
        {theos.folder}, a download of about 16 MB. Only this app uses that copy:
        Xcode, Terminal and the shell profile are left as they are. Nothing runs
        as root.
      </InstallTool>
    );
  }
  return (
    <Tool name="Theos" ready value={theos.version ?? "Installed"}>
      <ToolNote>
        Builds a project with make, packages it as a .deb file and installs it
        on the iPad. This copy belongs to the app, which gives it to make on
        each build, so Xcode and Terminal never see it.
      </ToolNote>
      <ToolDetails>
        <ToolDetail label="Folder" mono>
          {theos.folder}
        </ToolDetail>
        {theos.source && (
          <ToolDetail label="Source" mono>
            {theos.source}
          </ToolDetail>
        )}
        {theos.branch && (
          <ToolDetail label="Branch" mono>
            {theos.branch}
          </ToolDetail>
        )}
        {theos.commit && (
          <ToolDetail label="Commit">
            <span className="font-mono">{theos.commit}</span>
            {theos.committedAt && `, ${formatDate(theos.committedAt)}`}
          </ToolDetail>
        )}
        <ToolDetail label="SDKs">
          {theos.sdks.length > 0 ? listFormat.format(theos.sdks) : "None"}
        </ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

function Sdk({
  sdk,
  theos,
  disabled,
  onInstalled,
}: Installing & { sdk: SdkTool | null; theos: TheosTool }) {
  if (!sdk) {
    return (
      <InstallTool
        tool="sdk"
        name={sdkLabel}
        label="Install SDK"
        disabled={disabled || theos.state !== "installed"}
        onInstalled={onInstalled}
      >
        Downloads {sdkName}.sdk, about 5 MB, from the newest release of
        github.com/theos/sdks, unpacks it into {theos.folder}/sdks and adjusts
        it so that this Xcode can build with it. It holds the iOS {sdkVersion}{" "}
        headers and the {architecture} libraries that builds link against.
      </InstallTool>
    );
  }
  if (!sdk.adjusted) {
    return (
      <InstallTool
        tool="sdk"
        name={sdkLabel}
        label="Adjust SDK"
        busyLabel="Adjusting…"
        firstStep="adjust"
        disabled={disabled}
        onInstalled={onInstalled}
      >
        Changes three things in {sdk.folder}, without which this Xcode cannot
        build with it. Its library stubs stop listing the simulator
        architectures, which the linker refuses. Its older module maps get the
        file name the compiler now expects. And the C library&apos;s stub gains
        thirteen functions, memcpy and strcmp among them, that iOS {sdkVersion}{" "}
        has but the stub leaves out.
      </InstallTool>
    );
  }
  return (
    <Tool name={sdkLabel} ready value={sdk.version ?? "Installed"}>
      <ToolNote>
        The iOS {sdkVersion} headers and the libraries that builds link against,
        adjusted so that this Xcode can build with them.
      </ToolNote>
      <ToolDetails>
        <ToolDetail label="Folder" mono>
          {sdk.folder}
        </ToolDetail>
        {sdk.architectures.length > 0 && (
          <ToolDetail label="Architectures">
            {listFormat.format(sdk.architectures)}
          </ToolDetail>
        )}
      </ToolDetails>
    </Tool>
  );
}

function Formula({
  tool,
  installed,
  homebrew,
  purpose,
  disabled,
  onInstalled,
}: Installing & {
  tool: Extract<LaptopToolName, "ldid" | "xz">;
  installed: LaptopTool | null;
  homebrew: LaptopTool | null;
  purpose: string;
}) {
  if (!installed) {
    return (
      <InstallTool
        tool={tool}
        name={tool}
        label={`Install ${tool}`}
        disabled={disabled || !homebrew}
        onInstalled={onInstalled}
      >
        Runs brew install {tool}, which downloads {tool} and the libraries it
        needs into Homebrew&apos;s folder. {purpose}
      </InstallTool>
    );
  }
  return (
    <Tool name={tool} ready value={installed.version ?? "Installed"}>
      <ToolNote>{purpose}</ToolNote>
      <ToolDetails>
        <ToolDetail label="Location" mono>
          {installed.file}
        </ToolDetail>
      </ToolDetails>
    </Tool>
  );
}

export function isToolchainReady({
  xcode,
  homebrew,
  theos,
  sdk,
  ldid,
  xz,
}: LaptopToolchain): boolean {
  return (
    xcode !== null &&
    xcode.full &&
    xcode.armv7 &&
    homebrew !== null &&
    theos.state === "installed" &&
    sdk !== null &&
    sdk.adjusted &&
    ldid !== null &&
    xz !== null
  );
}

export function Toolchain({
  toolchain,
  ...installing
}: Installing & { toolchain: LaptopToolchain }) {
  const { xcode, homebrew, theos, sdk, ldid, xz } = toolchain;
  return (
    <ToolList>
      <Xcode xcode={xcode} />
      <Homebrew homebrew={homebrew} />
      <Theos toolchain={toolchain} {...installing} />
      <Sdk sdk={sdk} theos={theos} {...installing} />
      <Formula
        tool="ldid"
        installed={ldid}
        homebrew={homebrew}
        purpose="It gives binaries the pseudo-signature iOS 9 needs before the kernel will run them."
        {...installing}
      />
      <Formula
        tool="xz"
        installed={xz}
        homebrew={homebrew}
        purpose="Theos compresses packages with it."
        {...installing}
      />
    </ToolList>
  );
}
