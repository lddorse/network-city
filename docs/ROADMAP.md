# Initial Roadmap

## Milestone 0 — The First Delivery

Goal: Prove that the city-network metaphor is visually satisfying.

- Render a small overhead city map.
- Show two endpoint buildings.
- Show a road or network link between them.
- Animate one delivery vehicle from source to destination.
- Display a successful delivery event.

## Milestone 1 — Network Objects

Goal: Represent the smallest useful routed network.

- Add endpoint nodes.
- Add switches.
- Add routers.
- Add interfaces.
- Add links.
- Allow objects to be selected.
- Show an inspection panel for each object.

## Milestone 2 — IPv4 Configuration

Goal: Let the player configure interfaces.

- Implement Cisco-style CLI modes.
- Support interface selection.
- Support IPv4 addresses and subnet masks.
- Support interface shutdown and no shutdown.
- Implement `show ip interface brief`.
- Reflect interface state visually.

## Milestone 3 — Static Routing

Goal: Make traffic cross two routed LANs.

- Add routing tables.
- Add connected routes.
- Add local routes.
- Add static routes.
- Implement route lookup.
- Implement `show ip route`.
- Animate forwarding hop by hop.

## Milestone 4 — Troubleshooting

Goal: Make failure understandable.

- Missing route scenario.
- Disabled interface scenario.
- Incorrect IP address scenario.
- Incorrect subnet mask scenario.
- Packet failure reason.
- Route and interface visualization overlays.

## Milestone 5 — Dynamic Routing Prototype

Goal: Demonstrate the transition from static routing to dynamic routing.

- Add a small multi-router topology.
- Make static route maintenance intentionally cumbersome.
- Introduce routing protocol events.
- Visualize neighbor communication.
- Visualize route convergence.
- Compare static and dynamic behavior during a link failure.

## Milestone 6 — First Curriculum Module

Goal: Turn the simulator into a guided learning experience.

- Mission briefing.
- Learning objectives.
- Student prediction prompt.
- CLI task.
- Visual verification.
- Explanation questions.
- Completion state.
- Stored progress.
