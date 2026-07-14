# Design Philosophy

## 1. The Player Must Need the Technology

The game should not introduce a networking technology simply because it appears next in a curriculum.

The player should first experience the limitations of the current solution.

Static routing should feel useful before it becomes difficult to maintain.

Dynamic routing should feel necessary before it is introduced.

## 2. Every Command Changes the World

CLI commands modify simulation state.

The visual world reflects that state.

The graphics must never fake an effect that did not occur in the simulation.

## 3. The CLI Is Authentic

The player should learn syntax and output that transfer to Cisco environments and the CCNA exam.

The game may provide visual aids, explanations, and guided hints, but it should not replace real command-line interaction with fictional controls.

## 4. Visuals Explain Behavior

The visual layer exists to expose otherwise invisible events:

- forwarding decisions
- routing advertisements
- ARP requests
- route selection
- convergence
- packet loss
- congestion
- failures
- access control decisions

## 5. Prediction Before Observation

Whenever practical, the player should predict what will happen before running a command, disabling a link, or checking an output.

Prediction strengthens understanding and retrieval.

## 6. Failure Is Instruction

Misconfiguration, unreachable destinations, routing loops, incorrect masks, missing routes, and failed links are part of the learning experience.

The game should make failures understandable rather than merely punitive.

## 7. The City Is the Purpose

The network supports homes, schools, hospitals, businesses, public services, and future city systems.

The player is not configuring devices for their own sake.

The player is maintaining the infrastructure of a growing city.

## 8. Technical Accuracy Beats Visual Cleverness

Metaphors may simplify concepts, but they must not teach incorrect behavior.

When a metaphor conflicts with the real protocol, the real protocol wins.
