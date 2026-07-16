import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Router } from "@network-city/simulation-engine";
import { IosShell } from "@network-city/ios-cli";

interface TerminalProps {
  router: Router | undefined;
}

// One IosShell (and its transcript) per router id, kept alive for the
// lifetime of this component so switching selection away and back to the
// same router resumes the same session — mode, interface, history, and
// prior output all still there, like a real terminal you didn't disconnect.
interface RouterSession {
  shell: IosShell;
  transcript: string[];
}

function getOrCreateSession(sessions: Map<string, RouterSession>, router: Router): RouterSession {
  let session = sessions.get(router.id);

  if (!session) {
    session = { shell: new IosShell(router), transcript: [] };
    sessions.set(router.id, session);
  }

  return session;
}

const panelStyle: CSSProperties = {
  width: 480,
  flexShrink: 0,
  padding: 16,
  color: "#d1d5db",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  background: "#1f2937",
  borderRadius: 8,
};

const screenStyle: CSSProperties = {
  height: 240,
  overflowY: "auto",
  background: "#0b0f14",
  borderRadius: 4,
  padding: 10,
  fontFamily: "monospace",
  fontSize: 13,
  whiteSpace: "pre-wrap",
  color: "#9ce6a4",
};

const inputRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 8,
  fontFamily: "monospace",
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#9ce6a4",
  fontFamily: "monospace",
  fontSize: 13,
};

export default function Terminal({ router }: TerminalProps) {
  // Sessions live in state (not a ref) purely so reading the map during
  // render is safe; the map's identity never changes and it's mutated only
  // from event handlers, same as before.
  const [sessions] = useState<Map<string, RouterSession>>(() => new Map());
  const screenRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [historyCursor, setHistoryCursor] = useState<number | undefined>(undefined);
  // Bumped on every executed command purely to force this component to
  // re-render and re-read the session's live transcript/prompt — no
  // terminal data is copied into this state itself.
  const [, forceRerender] = useState(0);
  // Tracks which router's input/history-cursor state is currently loaded,
  // so switching routers resets those without needing an effect (adjusting
  // state during render, per React's guidance for derived-from-props state).
  const [trackedRouterId, setTrackedRouterId] = useState(router?.id);

  if (router?.id !== trackedRouterId) {
    setTrackedRouterId(router?.id);
    setInput("");
    setHistoryCursor(undefined);
  }

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  });

  if (!router) {
    return (
      <aside style={panelStyle}>
        <p style={{ margin: 0, color: "#9ca3af" }}>Select a router to open its terminal.</p>
      </aside>
    );
  }

  const session = getOrCreateSession(sessions, router);
  const { shell } = session;

  const runCommand = () => {
    session.transcript.push(`${shell.prompt} ${input}`);
    session.transcript.push(...shell.execute(input));
    setInput("");
    setHistoryCursor(undefined);
    forceRerender((n) => n + 1);
  };

  const navigateHistory = (direction: -1 | 1) => {
    const { history } = shell;

    if (history.length === 0) {
      return;
    }

    if (historyCursor === undefined) {
      if (direction === -1) {
        setHistoryCursor(history.length - 1);
        setInput(history[history.length - 1]);
      }
      return;
    }

    const nextIndex = historyCursor + direction;

    if (nextIndex < 0) {
      return;
    }

    if (nextIndex >= history.length) {
      setHistoryCursor(undefined);
      setInput("");
      return;
    }

    setHistoryCursor(nextIndex);
    setInput(history[nextIndex]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      navigateHistory(1);
    }
  };

  return (
    <aside style={panelStyle}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>{router.hostname} Terminal</h2>
      <div ref={screenRef} style={screenStyle}>
        {session.transcript.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <div style={inputRowStyle}>
        <span>{shell.prompt}</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          style={inputStyle}
        />
      </div>
    </aside>
  );
}
