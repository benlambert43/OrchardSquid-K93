import { parse } from "plist";

const binaryMagic = "bplist";

export function readPlist(file: Buffer): unknown {
  if (file.subarray(0, binaryMagic.length).toString() === binaryMagic) {
    return parse(file);
  }
  const text = file.toString();
  if (!/^\s*[<{(]/.test(text)) {
    throw new Error("The file is not a property list");
  }
  return parse(text);
}
