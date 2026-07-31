import { useCurrentFrame } from "remotion";
import { beat, bar, monoFont, palette, Panel, progress, Scene } from "./shared";

const CHIPS = ["48,211 sessions compared", "cohort diff", "deploy a3f9c21"];

/**
 * Chapter 3 — the catch. While the team missed it, databuddy raised one
 * critical insight about this exact incident. A single card, front and
 * center — everything on it is evidence from the same story.
 */
export function InsightsScene() {
	const frame = useCurrentFrame();
	const outro = progress(frame, bar(2), beat(1.5));

	return (
		<Scene>
			<div
				style={{
					inset: 0,
					position: "absolute",
					transform: `translateY(${outro * -1080}px)`,
				}}
			>
				<NoticeContent />
			</div>
			<div
				style={{
					alignItems: "center",
					display: "flex",
					fontSize: 68,
					fontWeight: 600,
					inset: 0,
					justifyContent: "center",
					letterSpacing: "-0.02em",
					position: "absolute",
					textAlign: "center",
					transform: `translateY(${(1 - outro) * 940}px)`,
				}}
			>
				you didn't set up an alert. it didn't need one.
			</div>
		</Scene>
	);
}

function NoticeContent() {
	const frame = useCurrentFrame();
	const meta = progress(frame, beat(3), 18);

	return (
		<Panel
			from={-20}
			style={{
				left: 240,
				padding: "54px 60px",
				top: 300,
				width: 1440,
			}}
		>
			<div style={{ alignItems: "center", display: "flex", gap: 14 }}>
				<div
					style={{
						backgroundColor: palette.red,
						borderRadius: 999,
						boxShadow: `0 0 12px ${palette.red}88`,
						height: 12,
						width: 12,
					}}
				/>
				<span style={{ color: palette.red, fontSize: 22, fontWeight: 600 }}>
					critical
				</span>
				<span
					style={{
						color: palette.muted,
						fontSize: 20,
						marginLeft: "auto",
						opacity: meta,
					}}
				>
					tuesday, 4:21 pm — 9 minutes after your deploy
				</span>
			</div>
			<div
				style={{
					fontSize: 48,
					fontWeight: 600,
					letterSpacing: "-0.015em",
					lineHeight: 1.25,
					marginTop: 22,
				}}
			>
				signup conversion dropped 34% right after deploy a3f9c21
			</div>
			<div style={{ display: "flex", gap: 14, marginTop: 30 }}>
				{CHIPS.map((chip) => (
					<span
						key={chip}
						style={{
							backgroundColor: "rgba(255,255,255,0.05)",
							border: `1px solid ${palette.border}`,
							borderRadius: 8,
							color: palette.muted,
							fontFamily: monoFont,
							fontSize: 18,
							padding: "7px 14px",
						}}
					>
						{chip}
					</span>
				))}
			</div>
		</Panel>
	);
}
