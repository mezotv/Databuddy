import { useCurrentFrame } from "remotion";
import { AnimatedLineChart } from "../../components/remocn/animated-line-chart";
import { TerminalSimulator } from "../../components/remocn/terminal-simulator";
import {
	beat,
	bar,
	monoFont,
	palette,
	Panel,
	progress,
	Scene,
	TitleReveal,
} from "./shared";

const LINES = [
	{
		text: "investigate anomaly: signup conversion -34%",
		type: "command" as const,
	},
	{ delay: 6, text: "querying 48,211 sessions…", type: "log" as const },
	{
		delay: 10,
		text: "comparing cohorts before / after deploy a3f9c21",
		type: "log" as const,
	},
	{
		delay: 12,
		text: "step-2 form event missing on mobile safari",
		type: "error" as const,
	},
	{
		delay: 12,
		text: "root cause → onboarding event binding removed in #559",
		type: "success" as const,
	},
];

const CONVERSION = [42, 44, 41, 43, 45, 44, 43, 29, 27, 28, 26, 27];

const HOLD = 40;

export function InvestigationScene() {
	return (
		<Scene>
			<TitleReveal
				hold={HOLD}
				outro="you were at lunch."
				outroAt={bar(3)}
				title="it investigated."
			>
				<InvestigationContent />
			</TitleReveal>
		</Scene>
	);
}

function InvestigationContent() {
	const frame = useCurrentFrame();
	const marker = progress(frame, beat(3), 16);

	return (
		<>
			{/* terminal is a fixed 900×480 window centered in its container */}
			<div
				style={{
					height: 624,
					left: -30,
					position: "absolute",
					top: 240,
					transform: "scale(1.08)",
					transformOrigin: "center",
					width: 1170,
				}}
			>
				<TerminalSimulator
					background="#0C0C10"
					charsPerFrame={4}
					chromeColor={palette.surface2}
					fontSize={19}
					lines={LINES}
					prompt="▸"
					title="databuddy intelligence — investigation 9f2"
				/>
			</div>
			<Panel
				from={beat(1)}
				style={{
					height: 500,
					left: 1180,
					padding: "30px 34px",
					top: 300,
					width: 640,
				}}
			>
				<div style={{ color: palette.muted, fontSize: 21, fontWeight: 500 }}>
					signup conversion · 14 days
				</div>
				<div
					style={{
						height: 360,
						marginTop: 24,
						position: "relative",
						width: 572,
					}}
				>
					<AnimatedLineChart
						data={CONVERSION}
						gridColor="#22222A"
						height={360}
						strokeColor={palette.red}
						strokeWidth={4}
						width={572}
					/>
					{/* deploy marker at the drop */}
					<div
						style={{
							backgroundColor: palette.amber,
							height: 320,
							left: 338,
							opacity: marker * 0.8,
							position: "absolute",
							top: 16,
							width: 2,
						}}
					/>
					<div
						style={{
							backgroundColor: "rgba(227,165,20,0.14)",
							border: `1px solid ${palette.amber}`,
							borderRadius: 8,
							color: palette.amber,
							fontFamily: monoFont,
							fontSize: 16,
							left: 352,
							opacity: marker,
							padding: "5px 10px",
							position: "absolute",
							top: 20,
						}}
					>
						deploy a3f9c21
					</div>
				</div>
			</Panel>
		</>
	);
}
