# AGENTS.md

## Project

Network City

## Mission

Build an overhead city simulation that teaches Cisco networking through authentic IOS-style CLI interaction and accurate visual network behavior.

Network City should help learners understand why networks behave the way they do, not merely memorize commands.

## Core Product Principles

- The player should experience a problem before being introduced to the technology that solves it.
- Every Cisco command should produce an observable consequence in the simulated world.
- Visual explanations must reinforce real networking behavior without replacing technical accuracy.
- The city exists to create meaningful infrastructure and connectivity problems.
- Prefer small, playable milestones over broad unfinished systems.
- Do not add a feature only because it may be useful someday.

## Architecture

### Simulation Engine

`packages/simulation-engine` owns framework-independent simulation state and behavior.

It must not depend on:

- React
- PixiJS
- browser APIs
- DOM APIs
- asset paths
- UI state
- rendering

The simulation engine may contain:

- World state
- entities
- nodes
- links
- vehicles
- movement
- simulation systems
- simulation events

### Networking Package

`packages/networking` will eventually contain networking-specific concepts such as:

- interfaces
- IPv4 addressing
- packets
- routing tables
- route selection
- static routing
- RIP
- OSPF
- EIGRP

Do not move networking behavior into this package before a concrete feature requires it.

As of the Interfaces, IPv4 Addressing, and IPv4 Subnet Derivation milestones, interfaces and IPv4 addressing already live in `packages/simulation-engine`. That is expected, not a violation of this section — it is exactly what "do not move it until required" produces.

### IOS CLI Package

`packages/ios-cli` will eventually parse authentic Cisco-style commands and translate them into simulation actions.

The CLI must modify simulation state rather than directly modifying the renderer or React state.

### Simulator App

`apps/simulator` owns:

- React UI
- PixiJS rendering
- input handling
- inspection panels
- CLI presentation
- visual effects
- asset loading

The simulator reads state from the engine and visualizes it.

The renderer must not become the source of truth.

The renderer observes `World` objects and never owns networking state.

## Source of Truth

The `World` is the source of truth for the current simulation.

React, PixiJS, and the CLI are interfaces to the World.

The renderer must read positions and state from the World rather than maintaining duplicate simulation state.

- Systems derive state rather than storing duplicate state (for example, `InterfaceStatusSystem` recomputes `operationalStatus` every tick instead of callers setting it directly).
- Prefer derived state over mutable, independently-tracked state whenever practical (for example, `IPv4Address` computes network/broadcast/mask on demand rather than the engine storing them separately).

## Entity and Rendering Rules

- Simulation entities must not render themselves.
- Simulation entities must not import PixiJS.
- Rendering code may map entity types and state to sprites or shapes.
- Visual positions must come from simulation state.
- Avoid duplicating coordinates in the renderer.
- Keep simple geometric fallback rendering available while sprite assets are incomplete.

## Movement Rules

- Movement belongs in the simulation engine.
- Speed is measured in world units per second.
- Movement must remain deterministic for a given delta.
- Large delta values must not skip required waypoint or arrival behavior.
- Arrival events must fire exactly once.
- The renderer only reads the current position.
- Movement along multiple segments should consume the remaining time budget accurately.

## Nodes and Links

The world should increasingly be modeled as connected nodes and links rather than unrelated coordinates.

A node may represent:

- a building
- a router
- a switch
- an endpoint
- another connected infrastructure object

A link represents an explicit connection between two nodes.

Links may later include:

- status
- cost
- bandwidth
- latency
- media type
- utilization

Do not implement routing decisions merely because links exist. Add routing only when a scoped milestone requires it.

## Networking Modeling

Model networking concepts in the engine before any Cisco command configures them.

The engine should model, roughly in this order:

- Node
- Link
- NetworkInterface
- IPv4Address
- Route
- RoutingTable

Each concept should work correctly and be observable in the simulator before the CLI can create, configure, or inspect it.

The CLI is a controller for the simulation, not the simulation itself.

## Coding Principles

- Prefer composition over inheritance unless inheritance clearly models an `is-a` relationship.
- Prefer plain data and pure helper functions where practical.
- Avoid generalized abstractions until at least one concrete feature requires them.
- Do not introduce ECS, XState, graph libraries, or other architectural systems without explicit approval.
- Keep public package exports intentional.
- Use TypeScript throughout.
- Keep changes narrow and directly related to the requested milestone.
- Do not refactor unrelated code during feature work.
- Preserve existing behavior unless the task explicitly changes it.
- Add dependencies only when necessary and ask before installing significant new ones.

## API Design

Prefer API names that describe the exact networking concept being modeled. Avoid names that imply broader networking semantics than the implementation actually provides.

For example, `hasMatchingSubnetConfiguration()` checks that two interfaces share a prefix length and a derived network address — a configuration consistency check. It is deliberately not named `isInSameSubnet()` or `isOnLinkWith()`, because real on-link determination is interface-perspective and can be asymmetric when prefix lengths differ (one side may consider the other on-link while the reverse does not hold). That is a separate, later API, not this one.

When a method's name could be read as promising more networking correctness than it delivers, rename it or scope it down before shipping it.

## Development Philosophy

- Build in small, incremental milestones.
- Behavior before visualization: engine behavior should be correct before the renderer displays it.
- Architecture before features: prefer the right shape now over a convenient shortcut that needs undoing later.
- Every new engine behavior ships with focused tests.
- The renderer stays as dumb as practical — it reads and displays `World` state, it does not decide networking behavior.

## Design Principle

Every milestone should answer one networking question.

Examples:

- What is an interface?
- What makes an interface operationally down?
- Where do connected routes come from?
- Why does a router choose one route over another?

Avoid implementing a feature simply because IOS has it. Implement the underlying networking behavior first, then let the CLI configure and inspect that behavior.

The CLI configures and inspects existing simulation behavior — it does not create networking behavior.

## Development Workflow

Before changing code:

1. Read this file.
2. Inspect the relevant repository files.
3. Check `git status`.
4. Confirm the requested task is bounded and testable.

After implementation:

1. Run the simulation-engine build or typecheck.
2. Run simulator lint.
3. Run simulator production build.
4. Fix any issues introduced by the task.
5. Report the exact files changed.
6. Explain the resulting data flow.
7. Identify remaining real risks without expanding the task.
8. Do not commit unless explicitly instructed.

The human developer performs visual and gameplay verification.

Do not search for or add browser automation unless explicitly requested.

Assume the developer may already have `npm run dev` running. Do not repeatedly start or stop preview servers unless needed.

## Git Rules

- Do not commit without explicit approval.
- Do not push without explicit approval.
- Do not rewrite Git history without explicit approval.
- Do not add AI co-author trailers to commits.
- Keep commit messages concise and imperative.
- Keep feature commits focused.
- Never commit `node_modules`, `dist`, `.vite`, coverage output, logs, or secret environment files.

## Permission Guidance

Routine actions inside this repository are expected:

- reading and editing project files
- running lint
- running builds
- running typechecks
- checking Git status and diffs
- using local development URLs

Ask before:

- installing major new dependencies
- deleting substantial directories
- changing architecture outside the requested scope
- modifying files outside the repository
- using `sudo`
- changing global system configuration
- committing or pushing code

## Current Roadmap

Build the project through small, named milestones.

Completed:

- ✓ World
- ✓ Movement
- ✓ Waypoint Movement
- ✓ Nodes
- ✓ Links
- ✓ Interfaces
- ✓ Interface State
- ✓ Delivery Blocking
- ✓ IPv4 Addressing
- ✓ IPv4 Subnet Derivation

Immediate upcoming milestones:

- Connected Routes
- Static Routes
- Route Lookup
- Packet Forwarding
- CLI
- RIP
- OSPF
- EIGRP

Do not begin AI tutoring, utilities, economy, or broad city simulation systems until the milestones above are complete. Routing protocols (RIP, OSPF, EIGRP) should not begin until Connected Routes, Static Routes, Route Lookup, and Packet Forwarding all exist — a routing protocol needs something to decide between and forward through first.

## Definition of Done

A task is complete when:

- the requested behavior works,
- the engine remains independent of React and PixiJS,
- the renderer reads simulation state rather than duplicating it,
- lint passes,
- typecheck/build passes,
- no unrelated feature was added,
- the working tree changes are clearly summarized,
- and the task has not been committed without approval.
