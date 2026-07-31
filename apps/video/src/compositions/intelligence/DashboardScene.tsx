import { Img, staticFile, useCurrentFrame } from "remotion";
import { AnimatedLineChart } from "../../components/remocn/animated-line-chart";
import {
	beat,
	bar,
	BrowserFrame,
	monoFont,
	palette,
	Panel,
	progress,
	Scene,
	TitleReveal,
} from "./shared";

// signup conversion, hourly — healthy until the deploy, then the drop
const CONVERSION_DROP = [42, 44, 41, 43, 45, 44, 43, 29, 27, 28, 26, 27];

const HOLD = beat(2);
const CORRECTION_AT = bar(2);

/**
 * Chapter 2 — the break. The dashboard had the evidence all along:
 * the conversion chart falls right after the deploy, but the team
 * isn't looking. Real product UI, dimmed; the incident panel in focus.
 */
export function DashboardScene() {
	return (
		<Scene>
			<TitleReveal
				hold={HOLD}
				outro={<NoticeCorrection />}
				outroAt={CORRECTION_AT}
				title="signups drop 34%."
			>
				<BreakContent />
			</TitleReveal>
		</Scene>
	);
}

function NoticeCorrection() {
	const frame = useCurrentFrame();
	const strike = progress(frame, CORRECTION_AT + beat(0.5), beat(1));
	const correction = progress(frame, CORRECTION_AT + beat(1), beat(1.25));

	return (
		<div
			style={{
				alignItems: "baseline",
				display: "flex",
				gap: 18,
				position: "relative",
			}}
		>
			<span style={{ position: "relative" }}>
				<span style={{ opacity: 0.58 }}>nobody</span>
				<svg
					aria-hidden="true"
					height="120"
					style={{
						left: -14,
						overflow: "visible",
						position: "absolute",
						top: -30,
					}}
					viewBox="0 0 280 120"
					width="280"
				>
					<path
						d="M 8 75 C 72 59, 156 82, 266 63"
						fill="none"
						stroke={palette.red}
						strokeDasharray={280}
						strokeDashoffset={280 * (1 - strike)}
						strokeLinecap="round"
						strokeWidth={8}
					/>
					<path
						d="M 14 68 C 91 82, 175 58, 270 72"
						fill="none"
						opacity={0.72}
						stroke={palette.red}
						strokeDasharray={280}
						strokeDashoffset={280 * (1 - strike)}
						strokeLinecap="round"
						strokeWidth={4}
					/>
				</svg>
				<span
					style={{
						color: palette.red,
						fontSize: 54,
						fontWeight: 600,
						left: -4,
						letterSpacing: "-0.025em",
						opacity: correction,
						position: "absolute",
						top: -74,
						transform: `rotate(-2deg) translateY(${(1 - correction) * 10}px)`,
						whiteSpace: "nowrap",
					}}
				>
					databuddy
				</span>
			</span>
			<span>noticed.</span>
		</div>
	);
}

function BreakContent() {
	const frame = useCurrentFrame();
	const badge = progress(frame, beat(2), 16);

	return (
		<>
			{/* the dashboard is there, nobody's looking — dimmed behind the incident */}
			<BrowserFrame
				from={0}
				style={{
					filter: "brightness(0.55)",
					height: 940,
					left: 120,
					top: 70,
					width: 1680,
				}}
				url="app.databuddy.cc/websites/notra"
			>
				<Img
					src={staticFile("dashboard-home-insights.png")}
					style={{ display: "block", width: "100%" }}
				/>
			</BrowserFrame>
			{/* the metric that broke, pulled into focus */}
			<Panel
				from={beat(1)}
				style={{
					height: 470,
					left: 480,
					padding: "30px 36px",
					top: 300,
					width: 960,
				}}
			>
				<div style={{ alignItems: "center", display: "flex", gap: 18 }}>
					<span style={{ color: palette.muted, fontSize: 22, fontWeight: 500 }}>
						signup conversion · this week
					</span>
					<span
						style={{
							backgroundColor: "rgba(248,113,113,0.14)",
							border: `1px solid ${palette.red}`,
							borderRadius: 8,
							color: palette.red,
							fontFamily: monoFont,
							fontSize: 19,
							opacity: badge,
							padding: "4px 12px",
						}}
					>
						−34%
					</span>
				</div>
				<div
					style={{
						height: 340,
						marginTop: 24,
						position: "relative",
						width: 888,
					}}
				>
					<AnimatedLineChart
						data={CONVERSION_DROP}
						gridColor="#22222A"
						height={340}
						strokeColor={palette.red}
						strokeWidth={4}
						width={888}
					/>
					<div
						style={{
							backgroundColor: palette.amber,
							height: 300,
							left: 524,
							opacity: badge * 0.8,
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
							left: 538,
							opacity: badge,
							padding: "5px 10px",
							position: "absolute",
							top: 20,
						}}
					>
						your deploy · a3f9c21
					</div>
				</div>
			</Panel>
		</>
	);
}
