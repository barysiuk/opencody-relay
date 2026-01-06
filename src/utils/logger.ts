import pc from "picocolors";

let verboseMode = false;

export function setVerbose(verbose: boolean) {
  verboseMode = verbose;
}

export function isVerbose(): boolean {
  return verboseMode;
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export const log = {
  info: (message: string) => {
    console.log(message);
  },

  success: (message: string) => {
    console.log(pc.green(`\u2713 ${message}`));
  },

  error: (message: string) => {
    console.error(pc.red(`\u2717 ${message}`));
  },

  warn: (message: string) => {
    console.warn(pc.yellow(`! ${message}`));
  },

  event: (event: string, detail?: string) => {
    const ts = pc.dim(`[${timestamp()}]`);
    const msg = detail ? `${event}: ${pc.cyan(`"${detail}"`)}` : event;
    console.log(`${ts} ${msg}`);
  },

  arrow: (message: string) => {
    console.log(pc.dim(`  \u2192 ${message}`));
  },

  verbose: (message: string) => {
    if (verboseMode) {
      console.log(pc.dim(`[debug] ${message}`));
    }
  },

  header: (title: string) => {
    console.log();
    console.log(pc.bold(title));
    console.log(pc.dim("=".repeat(title.length)));
  },

  blank: () => {
    console.log();
  },
};
