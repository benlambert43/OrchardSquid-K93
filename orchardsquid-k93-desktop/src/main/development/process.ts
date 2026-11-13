import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

import { toolEnvironment } from "@/main/development/tools.ts";

const keptCharacters = 256 * 1024;
const reportedLines = 12;
const escapeSequence = new RegExp(String.raw`\x1b\[[0-9;?]*[A-Za-z]`, "g");
const unhelpfulLine = /:\s+\d+% \(\d+\/\d+\)|^make(?:\[\d+\])?: \*\*\*/;

export interface ProcessResult {
  code: number | null;
  stdout: string;
  output: string;
}

interface ProcessOptions {
  quietTimeoutMs: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: Uint8Array;
  onLine?: (line: string) => void;
}

function keep(text: string, added: string): string {
  return `${text}${added}`.slice(-keptCharacters);
}

export function runProcess(
  file: string,
  args: string[],
  { quietTimeoutMs, cwd, env, input, onLine }: ProcessOptions,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(file, args, {
      cwd,
      env: { ...toolEnvironment(), ...env },
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let output = "";
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      child.kill();
    }, quietTimeoutMs);

    const follow = (toStdout: boolean) => {
      const decoder = new StringDecoder();
      let unfinished = "";
      return (chunk: Buffer) => {
        timer.refresh();
        const text = decoder.write(chunk).replaceAll(escapeSequence, "");
        output = keep(output, text);
        if (toStdout) {
          stdout = keep(stdout, text);
        }
        if (onLine) {
          const lines = `${unfinished}${text}`.split(/[\r\n]/);
          unfinished = lines.pop() ?? "";
          lines.filter(Boolean).forEach(onLine);
        }
      };
    };
    child.stdout?.on("data", follow(true));
    child.stderr?.on("data", follow(false));

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, output: keep(output, error.message) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code: expired ? null : code,
        stdout,
        output: expired
          ? keep(output, "\nStopped after too long without output.")
          : output,
      });
    });
    if (child.stdin) {
      child.stdin.on("error", () => undefined);
      child.stdin.end(input);
    }
  });
}

export function lastLines(output: string): string {
  return output
    .split(/[\r\n]/)
    .filter((line) => line.trim() && !unhelpfulLine.test(line))
    .slice(-reportedLines)
    .join("\n");
}
