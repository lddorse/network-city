import { useEffect, useRef } from "react";
import { Application, Graphics, Text } from "pixi.js";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = containerRef.current;

    if (!host) {
      return;
    }

    const app = new Application();
    let cancelled = false;
    let initialized = false;

    async function startPixi() {
      await app.init({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        background: "#7dbb6a",
        antialias: true,
      });

      initialized = true;

      // React may have already cleaned up this effect while Pixi was initializing.
      if (cancelled) {
        app.destroy(true, {
          children: true,
          texture: true,
          textureSource: true,
        });
        return;
      }

      host.appendChild(app.canvas);

      const world = new Graphics();

      // Main road
      world.rect(0, 265, WORLD_WIDTH, 110);
      world.fill(0x555555);

      // Center line
      world.rect(0, 316, WORLD_WIDTH, 8);
      world.fill(0xf2d95c);

      // Home building
      world.roundRect(90, 120, 150, 100, 8);
      world.fill(0xd8c3a5);

      // Hospital building
      world.roundRect(720, 420, 160, 110, 8);
      world.fill(0xc9d8e6);

      // Routers
      world.circle(350, 320, 34);
      world.fill(0x345995);

      world.circle(610, 320, 34);
      world.fill(0x345995);

      // Router link
      world.moveTo(384, 320);
      world.lineTo(576, 320);
      world.stroke({
        width: 6,
        color: 0x82d8ff,
      });

      app.stage.addChild(world);

      const title = new Text({
        text: "Network City",
        style: {
          fill: 0xffffff,
          fontSize: 24,
          fontWeight: "bold",
        },
      });

      title.position.set(20, 20);
      app.stage.addChild(title);

      const r1Label = new Text({
        text: "R1",
        style: {
          fill: 0xffffff,
          fontSize: 18,
        },
      });

      r1Label.anchor.set(0.5);
      r1Label.position.set(350, 320);
      app.stage.addChild(r1Label);

      const r2Label = new Text({
        text: "R2",
        style: {
          fill: 0xffffff,
          fontSize: 18,
        },
      });

      r2Label.anchor.set(0.5);
      r2Label.position.set(610, 320);
      app.stage.addChild(r2Label);
    }

    startPixi().catch((error: unknown) => {
      console.error("Failed to initialize Network City:", error);
    });

    return () => {
      cancelled = true;

      if (!initialized) {
        return;
      }

      if (app.canvas.parentNode === host) {
        host.removeChild(app.canvas);
      }

      app.destroy(true, {
        children: true,
        texture: true,
        textureSource: true,
      });
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111827",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "white", marginTop: 0 }}>Network City</h1>
      <div ref={containerRef} />
    </main>
  );
}
