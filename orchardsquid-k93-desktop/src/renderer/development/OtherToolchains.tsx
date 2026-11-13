import { DetailNote, Panel, PanelNote } from "@orchardsquid-k93/ui";

import { developmentTarget } from "@/developmentSetup.ts";
import { Command } from "@/renderer/Command.tsx";

const { sdk, sdkVersion, minimumVersion, architecture, usbPort } =
  developmentTarget;

export function OtherToolchains() {
  return (
    <Panel title="Other toolchains">
      <PanelNote>
        Theos is the toolchain the steps above set up. These are the other ways
        to build for the iPad 2, and where each one fits.
      </PanelNote>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        <li className="py-2.5 font-medium wrap-anywhere">
          Clang on its own
          <DetailNote>
            Compiles a single program without a project. It uses the same SDK
            Theos installs, and the binary needs a pseudo-signature from ldid
            before iOS {sdkVersion} will run it.
          </DetailNote>
          <Command>
            {`xcrun --sdk iphoneos clang -arch ${architecture} -miphoneos-version-min=${minimumVersion} -isysroot $THEOS/sdks/${sdk}.sdk main.c -o hello`}
          </Command>
          <Command>ldid -S hello</Command>
          <Command>{`scp -P ${String(usbPort)} hello root@127.0.0.1:/var/mobile/`}</Command>
        </li>
        <li className="py-2.5 font-medium wrap-anywhere">
          Xcode 7 or 8
          <DetailNote>
            These came with the iOS 9 SDK and could debug on 32-bit devices, but
            they do not run on current versions of macOS or on Apple silicon.
            Current Xcode still compiles and links {architecture} but no longer
            ships {architecture} libraries or deploys to iOS 9, which is why the
            steps above borrow the SDK from Theos.
          </DetailNote>
        </li>
        <li className="py-2.5 font-medium wrap-anywhere">
          Theos on the iPad
          <DetailNote>
            Theos can also run on the iPad itself, once it has a compiler. The
            Compiler steps on the Dependencies page track that.
          </DetailNote>
        </li>
        <li className="py-2.5 font-medium wrap-anywhere">
          Linux with an open-source toolchain
          <DetailNote>
            On a Linux machine, a community toolchain such as the one Procursus
            packages provides clang, ld64 and ldid for {architecture}. Theos
            runs there too, with the same SDK, and installs builds over SSH in
            the same way.
          </DetailNote>
        </li>
      </ul>
    </Panel>
  );
}
