import { DataFlowPipes } from "../../components/remocn/data-flow-pipes";
import { GlassCodeBlock } from "../../components/remocn/glass-code-block";
import { bar, beat, palette, Scene, TitleReveal } from "./shared";

const SNIPPET = `import { Databuddy } from "@databuddy/sdk/react";

export function Layout({ children }) {
  return (
    <>
      <Databuddy
        clientId="notra_prod"
        trackWebVitals
        trackErrors
      />
      {children}
    </>
  );
}`;

const NODES = [
	{ id: "web", label: "Web", x: 620, y: 150 },
	{ id: "mobile", label: "Mobile", x: 590, y: 320 },
	{ id: "server", label: "Server", x: 620, y: 490 },
	{ id: "stripe", label: "Stripe", x: 680, y: 640 },
	{ id: "databuddy", label: "Databuddy", x: 940, y: 390 },
	{ id: "intelligence", label: "Intelligence", x: 1190, y: 390 },
];

const EDGES = [
	{ from: "web", startFrame: beat(1), to: "databuddy" },
	{ from: "mobile", startFrame: beat(2), to: "databuddy" },
	{ from: "server", startFrame: beat(3), to: "databuddy" },
	{ from: "stripe", startFrame: beat(4), to: "databuddy" },
	{ from: "databuddy", startFrame: beat(5), to: "intelligence" },
];

const HOLD = 40;

export function ConnectScene() {
	return (
		<Scene>
			<TitleReveal
				hold={HOLD}
				outro="connect your data. it does the rest."
				outroAt={bar(2)}
				title="want this for your product?"
			>
				{/* DataFlowPipes lays out in a 1280×720 viewBox — scale to fill 1920×1080 */}
				<div
					style={{
						height: 720,
						left: 0,
						position: "absolute",
						top: 0,
						transform: "scale(1.5)",
						transformOrigin: "top left",
						width: 1280,
					}}
				>
					<DataFlowPipes
						edges={EDGES}
						nodeColor={palette.surface}
						nodes={NODES}
						pipeColor="#1E1E26"
						pulseColor={palette.accent}
						pulseDuration={30}
						textColor={palette.text}
					/>
				</div>
				<div
					style={{
						height: 560,
						left: 40,
						position: "absolute",
						top: 260,
						width: 700,
					}}
				>
					<GlassCodeBlock
						code={SNIPPET}
						fontSize={17}
						glassColor="rgba(13,13,16,0.78)"
						height={520}
						staggerFrames={3}
						title="layout.tsx"
						width={640}
					/>
				</div>
			</TitleReveal>
		</Scene>
	);
}
