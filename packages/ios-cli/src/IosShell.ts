import type { NetworkInterface, Router } from "@network-city/simulation-engine";
import { showIpInterfaceBrief } from "./commands/showIpInterfaceBrief.ts";
import { showIpRoute } from "./commands/showIpRoute.ts";
import { runCommandTable, type Command } from "./commandTable.ts";

export type CliMode = "user" | "privileged" | "config" | "config-if";

// The exact string Cisco IOS prints for a command it doesn't recognize in
// the current mode. Real IOS has no separate "wrong mode" message either —
// a privileged-only command typed in user mode produces this same error.
const INVALID_INPUT = "% Invalid input detected at '^' marker.";

// Printed for a token sequence that is a valid prefix of a known multi-word
// command but doesn't yet name one (e.g. "configure" or "conf" alone).
const INCOMPLETE_COMMAND = "% Incomplete command.";

// Splits on whitespace; filters empty tokens so repeated spaces collapse.
function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter((token) => token.length > 0);
}

// Parses, holds mode/interface state, and dispatches commands for exactly
// one router. Never stores or derives networking data itself — every show
// command reads router state live at call time via the engine APIs.
export class IosShell {
  readonly router: Router;
  mode: CliMode = "user";
  currentInterface: NetworkInterface | undefined = undefined;
  readonly history: string[] = [];

  constructor(router: Router) {
    this.router = router;
  }

  get prompt(): string {
    const hostname = this.router.hostname;

    switch (this.mode) {
      case "user":
        return `${hostname}>`;
      case "privileged":
        return `${hostname}#`;
      case "config":
        return `${hostname}(config)#`;
      case "config-if":
        return `${hostname}(config-if)#`;
    }
  }

  // Returns the output lines produced by the command; mode/interface state
  // is updated as a side effect. Blank input produces no output and is not
  // recorded in history, matching a bare Enter press on a real terminal.
  execute(rawLine: string): string[] {
    const tokens = tokenize(rawLine);

    if (tokens.length === 0) {
      return [];
    }

    this.history.push(tokens.join(" "));

    const lowerTokens = tokens.map((token) => token.toLowerCase());

    switch (this.mode) {
      case "user":
        return this.dispatchUser(lowerTokens);
      case "privileged":
        return this.dispatchPrivileged(lowerTokens);
      case "config":
        return this.dispatchConfig(lowerTokens);
      case "config-if":
        return this.dispatchConfigIf(lowerTokens);
    }
  }

  private dispatchUser(tokens: string[]): string[] {
    const commands: Command[] = [
      {
        canonical: ["enable"],
        aliases: [["en"]],
        run: () => {
          this.mode = "privileged";
          return [];
        },
      },
    ];

    return runCommandTable(tokens, commands, INVALID_INPUT, INCOMPLETE_COMMAND);
  }

  private dispatchPrivileged(tokens: string[]): string[] {
    const commands: Command[] = [
      {
        canonical: ["disable"],
        aliases: [],
        run: () => {
          this.mode = "user";
          return [];
        },
      },
      {
        canonical: ["configure", "terminal"],
        aliases: [["conf", "t"]],
        run: () => {
          this.mode = "config";
          return [];
        },
      },
      {
        canonical: ["show", "ip", "interface", "brief"],
        aliases: [],
        run: () => showIpInterfaceBrief(this.router),
      },
      {
        canonical: ["show", "ip", "route"],
        aliases: [],
        run: () => showIpRoute(this.router),
      },
    ];

    return runCommandTable(tokens, commands, INVALID_INPUT, INCOMPLETE_COMMAND);
  }

  private dispatchConfig(tokens: string[]): string[] {
    const interfaceResult = this.tryInterfaceCommand(tokens);

    if (interfaceResult) {
      return interfaceResult;
    }

    const commands: Command[] = [
      {
        canonical: ["exit"],
        aliases: [],
        run: () => {
          this.mode = "privileged";
          return [];
        },
      },
      {
        canonical: ["end"],
        aliases: [],
        run: () => {
          this.mode = "privileged";
          return [];
        },
      },
    ];

    return runCommandTable(tokens, commands, INVALID_INPUT, INCOMPLETE_COMMAND);
  }

  private dispatchConfigIf(tokens: string[]): string[] {
    const commands: Command[] = [
      {
        canonical: ["exit"],
        aliases: [],
        run: () => {
          this.mode = "config";
          this.currentInterface = undefined;
          return [];
        },
      },
      {
        canonical: ["end"],
        aliases: [],
        run: () => {
          this.mode = "privileged";
          this.currentInterface = undefined;
          return [];
        },
      },
      {
        canonical: ["shutdown"],
        aliases: [],
        // administrativeStatus is the only thing the CLI touches; operationalStatus,
        // routes, delivery, and rendering all follow from it through the existing
        // engine systems on their next tick.
        run: () => {
          this.currentInterface!.administrativeStatus = "down";
          return [];
        },
      },
      {
        canonical: ["no", "shutdown"],
        aliases: [],
        run: () => {
          this.currentInterface!.administrativeStatus = "up";
          return [];
        },
      },
    ];

    return runCommandTable(tokens, commands, INVALID_INPUT, INCOMPLETE_COMMAND);
  }

  // "interface"/"int" takes a required interface-name argument, so it isn't
  // expressible as one of Command's fixed token sequences — handled here,
  // ahead of the fixed command table in dispatchConfig. Returns undefined
  // when the first token isn't "interface" or "int" at all, so the caller
  // can fall through to the regular table.
  private tryInterfaceCommand(tokens: string[]): string[] | undefined {
    if (tokens[0] !== "interface" && tokens[0] !== "int") {
      return undefined;
    }

    if (tokens.length === 1) {
      return [INCOMPLETE_COMMAND];
    }

    if (tokens.length !== 2) {
      return [INVALID_INPUT];
    }

    return this.enterInterface(tokens[1]);
  }

  // Looked up against the router's actual interfaces rather than a
  // hardcoded name list, so any interface the World defines is navigable.
  // `name` is already lowercased by execute().
  private enterInterface(name: string): string[] {
    const iface = this.router.interfaces.find((candidate) => candidate.name.toLowerCase() === name);

    if (!iface) {
      return [INVALID_INPUT];
    }

    this.mode = "config-if";
    this.currentInterface = iface;
    return [];
  }
}
