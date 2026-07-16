// A small, explicit command-matching layer for the IOS shell.
//
// Each Command lists its canonical token sequence plus any additional exact
// token sequences ("aliases") accepted today — e.g. "conf t" as an alias
// for "configure terminal", or "en" as an alias for "enable". Matching is
// always against one of these listed sequences; there is no generic
// shortest-unique-prefix inference here, so aliases stay predictable and
// only exist where explicitly listed.
//
// A token sequence that is a strict prefix of some command's canonical or
// alias sequence (but not equal to it) is reported "incomplete" rather than
// "invalid", mirroring real IOS's "% Incomplete command." for e.g.
// "configure" or "conf" typed alone.
//
// Migrating to a real IOS-style command tree later (shortest-unique-prefix
// matching, ambiguous-command detection, `?` help, tab completion) means
// replacing the matching logic in matchCommand — a Command's canonical
// token sequence is already shaped like a path through that tree, so
// callers of runCommandTable shouldn't need to change.
export interface Command {
  canonical: string[];
  aliases: string[][];
  run: () => string[];
}

type CommandMatch =
  | { kind: "matched"; command: Command }
  | { kind: "incomplete" }
  | { kind: "invalid" };

function sequencesOf(command: Command): string[][] {
  return [command.canonical, ...command.aliases];
}

function tokensEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((token, index) => token === b[index]);
}

function isProperPrefix(tokens: string[], sequence: string[]): boolean {
  return (
    tokens.length > 0 &&
    tokens.length < sequence.length &&
    tokens.every((token, index) => token === sequence[index])
  );
}

function matchCommand(tokens: string[], commands: Command[]): CommandMatch {
  for (const command of commands) {
    if (sequencesOf(command).some((sequence) => tokensEqual(tokens, sequence))) {
      return { kind: "matched", command };
    }
  }

  const isIncomplete = commands.some((command) =>
    sequencesOf(command).some((sequence) => isProperPrefix(tokens, sequence))
  );

  return isIncomplete ? { kind: "incomplete" } : { kind: "invalid" };
}

// Runs the matching command, or returns invalidMessage / incompleteMessage
// as a single-line result. tokens must already be lowercased.
export function runCommandTable(
  tokens: string[],
  commands: Command[],
  invalidMessage: string,
  incompleteMessage: string
): string[] {
  const result = matchCommand(tokens, commands);

  if (result.kind === "matched") {
    return result.command.run();
  }

  return [result.kind === "incomplete" ? incompleteMessage : invalidMessage];
}
