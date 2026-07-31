import { useCurrentFrame } from "remotion";
import { AnimatedLineChart } from "../../components/remocn/animated-line-chart";
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

// same metric as chapter 2 — the drop, then the climb back after the fix
const RECOVERY = [27, 26, 27, 28, 27, 26, 38, 42, 44, 43, 45, 46];

const HOLD = 40;

/**
 * Chapter 6 — the recovery. The same conversion line comes back up past
 * the "fix deployed" marker, and databuddy leaves the product better than
 * it found it: the missing event now tracked, a goal watching it.
 */
export function BuildScene() {
	return (
		<Scene>
			<TitleReveal
				hold={HOLD}
				outro="and now it's actually tracked."
				outroAt={bar(3)}
				title="by friday, signups recovered."
			>
				<RecoveryContent />
			</TitleReveal>
		</Scene>
	);
}

function RecoveryContent() {
	const frame = useCurrentFrame();
	const marker = progress(frame, beat(2), 16);
	const goal = progress(frame, beat(3), 24);

	return (
		<>
			{/* the same chart from chapter 2, now recovering */}
			<Panel
				from={beat(1)}
				style={{
					height: 560,
					left: 100,
					padding: "30px 36px",
					top: 260,
					width: 1060,
				}}
			>
				<div style={{ alignItems: "center", display: "flex", gap: 18 }}>
					<span style={{ color: palette.muted, fontSize: 22, fontWeight: 500 }}>
						signup conversion · this week
					</span>
					<span
						style={{
							backgroundColor: "rgba(56,217,150,0.14)",
							border: `1px solid ${palette.green}`,
							borderRadius: 8,
							color: palette.green,
							fontFamily: monoFont,
							fontSize: 19,
							opacity: marker,
							padding: "4px 12px",
						}}
					>
						back to baseline
					</span>
				</div>
				<div
					style={{
						height: 430,
						marginTop: 24,
						position: "relative",
						width: 988,
					}}
				>
					<AnimatedLineChart
						data={RECOVERY}
						gridColor="#22222A"
						height={430}
						strokeColor={palette.green}
						strokeWidth={4}
						width={988}
					/>
					<div
						style={{
							backgroundColor: palette.green,
							height: 390,
							left: 494,
							opacity: marker * 0.7,
							position: "absolute",
							top: 16,
							width: 2,
						}}
					/>
					<div
						style={{
							backgroundColor: "rgba(56,217,150,0.14)",
							border: `1px solid ${palette.green}`,
							borderRadius: 8,
							color: palette.green,
							fontFamily: monoFont,
							fontSize: 16,
							left: 508,
							opacity: marker,
							padding: "5px 10px",
							position: "absolute",
							top: 20,
						}}
					>
						#581 deployed
					</div>
				</div>
			</Panel>
			{/* what it left behind: the event tracked, a goal watching it */}
			<Panel
				from={beat(2)}
				style={{
					height: 260,
					left: 1220,
					padding: "30px 34px",
					top: 260,
					width: 600,
				}}
			>
				<div style={{ color: palette.muted, fontSize: 20, fontWeight: 500 }}>
					event · created by databuddy
				</div>
				<div
					style={{
						backgroundColor: "rgba(124,134,255,0.12)",
						border: `1px solid ${palette.accent}`,
						borderRadius: 10,
						color: palette.accent,
						display: "inline-block",
						fontFamily: monoFont,
						fontSize: 21,
						marginTop: 20,
						padding: "9px 16px",
					}}
				>
					onboarding_step_completed
				</div>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						gap: 10,
						marginTop: 26,
					}}
				>
					<div
						style={{
							backgroundColor: palette.green,
							borderRadius: 999,
							boxShadow: `0 0 12px ${palette.green}`,
							height: 10,
							width: 10,
						}}
					/>
					<span style={{ color: palette.muted, fontSize: 20 }}>
						receiving events
					</span>
				</div>
			</Panel>
			<Panel
				from={beat(3)}
				style={{
					height: 270,
					left: 1220,
					padding: "30px 34px",
					top: 550,
					width: 600,
				}}
			>
				<div style={{ color: palette.muted, fontSize: 20, fontWeight: 500 }}>
					goal · created by databuddy
				</div>
				<div
					style={{
						fontSize: 30,
						fontWeight: 600,
						letterSpacing: "-0.01em",
						marginTop: 18,
					}}
				>
					signup → activation
				</div>
				<div
					style={{
						backgroundColor: "rgba(255,255,255,0.06)",
						borderRadius: 999,
						height: 16,
						marginTop: 34,
						overflow: "hidden",
						width: "100%",
					}}
				>
					<div
						style={{
							backgroundColor: palette.green,
							borderRadius: 999,
							height: "100%",
							width: `${goal * 68}%`,
						}}
					/>
				</div>
			</Panel>
		</>
	);
}
