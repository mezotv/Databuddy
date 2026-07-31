import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Typewriter } from "../../components/remocn/typewriter";
import {
	BrowserFrame,
	bar,
	github,
	monoFont,
	progress,
	riseIn,
	Scene,
	TitleReveal,
} from "./shared";

const DIFF: { text: string; type: "add" | "context" | "del" | "hunk" }[] = [
	{
		text: "@@ -41,7 +41,13 @@ export function StepTwo({ onNext }: StepTwoProps) {",
		type: "hunk",
	},
	{ text: "   const form = useForm<StepTwoValues>();", type: "context" },
	{
		text: "-  return <StepForm form={form} onSubmit={onNext} />;",
		type: "del",
	},
	{ text: "+  const track = useTrack();", type: "add" },
	{ text: "+  return (", type: "add" },
	{ text: "+    <StepForm", type: "add" },
	{ text: "+      form={form}", type: "add" },
	{ text: "+      onSubmit={(values) => {", type: "add" },
	{
		text: '+        track("onboarding_step_completed", { step: 2 });',
		type: "add",
	},
	{ text: "+        onNext(values);", type: "add" },
	{ text: "+      }}", type: "add" },
	{ text: "+    />", type: "add" },
	{ text: "+  );", type: "add" },
];

const CHECKS = [
	{ from: 58, name: "lint / biome" },
	{ from: 68, name: "types / tsc" },
	{ from: 78, name: "tests / bun test" },
];

const HOLD = 40;

const diffColors = {
	add: { bg: github.diffAddBg, fg: github.diffAddText },
	context: { bg: "transparent", fg: github.muted },
	del: { bg: github.diffDelBg, fg: github.diffDelText },
	hunk: { bg: "rgba(56,139,253,0.1)", fg: github.blue },
} as const;

function DiffRow({ from, row }: { from: number; row: (typeof DIFF)[number] }) {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [from, from + 5], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const { bg, fg } = diffColors[row.type];

	return (
		<div
			style={{
				backgroundColor: bg,
				color: fg,
				fontFamily: monoFont,
				fontSize: 17.5,
				lineHeight: 1.65,
				opacity,
				padding: "0 18px",
				whiteSpace: "pre",
			}}
		>
			{row.text}
		</div>
	);
}

function CheckRow({ from, name }: { from: number; name: string }) {
	const frame = useCurrentFrame();
	const done = frame >= from;

	return (
		<div
			style={{
				alignItems: "center",
				borderTop: `1px solid ${github.border}`,
				color: github.text,
				display: "flex",
				fontSize: 19,
				gap: 14,
				padding: "13px 18px",
			}}
		>
			{done ? (
				<div
					style={{
						alignItems: "center",
						backgroundColor: github.diffAddText,
						borderRadius: 999,
						color: "#04120A",
						display: "flex",
						fontSize: 13,
						fontWeight: 700,
						height: 22,
						justifyContent: "center",
						opacity: progress(frame, from, 8),
						width: 22,
					}}
				>
					✓
				</div>
			) : (
				<div
					style={{
						border: `3px solid ${github.muted}`,
						borderRadius: 999,
						borderTopColor: "transparent",
						height: 18,
						transform: `rotate(${frame * 14}deg)`,
						width: 18,
					}}
				/>
			)}
			<span style={{ fontFamily: monoFont }}>{name}</span>
			<span style={{ color: github.muted, marginLeft: "auto" }}>
				{done ? "successful" : "in progress…"}
			</span>
		</div>
	);
}

export function PullRequestScene() {
	return (
		<Scene>
			<TitleReveal
				hold={HOLD}
				outro="written by databuddy. reviewed by you."
				outroAt={bar(3)}
				title="and opened the fix."
			>
				<PullRequestContent />
			</TitleReveal>
		</Scene>
	);
}

function PullRequestContent() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const badge = progress(frame, 24, 14);

	return (
		<BrowserFrame
			chrome="#010409"
			from={0}
			style={{ height: 940, left: 120, top: 70, width: 1680 }}
			url="github.com/databuddy-analytics/Databuddy/pull/581"
		>
			<div
				style={{
					backgroundColor: github.bg,
					color: github.text,
					height: "100%",
					padding: "36px 56px",
					position: "absolute",
					width: "100%",
				}}
			>
				<div style={{ color: github.muted, fontSize: 18 }}>
					databuddy-analytics / <b style={{ color: github.text }}>Databuddy</b>
				</div>
				{/* PR title types itself */}
				<div style={{ height: 64, marginTop: 18, position: "relative" }}>
					<div style={{ inset: 0, position: "absolute" }}>
						<Typewriter
							charsPerSecond={40}
							color={github.text}
							cursorColor={github.blue}
							fontSize={38}
							fontWeight={500}
							text="fix(onboarding): restore step-2 event binding  #581"
						/>
					</div>
				</div>
				<div
					style={{
						alignItems: "center",
						display: "flex",
						gap: 16,
						marginTop: 14,
					}}
				>
					<div
						style={{
							alignItems: "center",
							backgroundColor: github.green,
							borderRadius: 999,
							color: "#FFFFFF",
							display: "flex",
							fontSize: 19,
							fontWeight: 600,
							gap: 8,
							opacity: badge,
							padding: "8px 18px",
						}}
					>
						⊙ Open
					</div>
					<span
						style={{
							color: github.muted,
							fontSize: 18,
							...riseIn(frame, fps, 30, 8),
						}}
					>
						<b style={{ color: github.text }}>databuddy-intelligence</b>{" "}
						<span
							style={{
								border: `1px solid ${github.border}`,
								borderRadius: 999,
								fontSize: 14,
								padding: "1px 8px",
							}}
						>
							Bot
						</span>{" "}
						wants to merge 1 commit into{" "}
						<code style={{ color: github.blue }}>staging</code>
					</span>
				</div>
				{/* tabs */}
				<div
					style={{
						borderBottom: `1px solid ${github.border}`,
						display: "flex",
						gap: 36,
						marginTop: 26,
						paddingBottom: 14,
						...riseIn(frame, fps, 30, 8),
					}}
				>
					{["Conversation", "Commits 1", "Checks 3", "Files changed 2"].map(
						(tab, i) => (
							<span
								key={tab}
								style={{
									color: i === 3 ? github.text : github.muted,
									fontSize: 18,
									fontWeight: i === 3 ? 600 : 400,
								}}
							>
								{tab}
							</span>
						)
					)}
					<span
						style={{
							fontFamily: monoFont,
							fontSize: 18,
							marginLeft: "auto",
						}}
					>
						<span style={{ color: github.diffAddText }}>+38</span>{" "}
						<span style={{ color: github.diffDelText }}>−6</span>
					</span>
				</div>
				{/* diff */}
				<div
					style={{
						border: `1px solid ${github.border}`,
						borderRadius: 10,
						marginTop: 24,
						overflow: "hidden",
						...riseIn(frame, fps, 40, 14),
					}}
				>
					<div
						style={{
							backgroundColor: github.surface,
							borderBottom: `1px solid ${github.border}`,
							color: github.muted,
							fontFamily: monoFont,
							fontSize: 17,
							padding: "10px 18px",
						}}
					>
						apps/web/src/components/onboarding/step-two.tsx
					</div>
					{DIFF.map((row, i) => (
						<DiffRow from={44 + i * 4} key={row.text} row={row} />
					))}
				</div>
				{/* checks */}
				<div
					style={{
						border: `1px solid ${github.border}`,
						borderRadius: 10,
						marginTop: 22,
						overflow: "hidden",
						...riseIn(frame, fps, 66, 14),
					}}
				>
					{CHECKS.map((check) => (
						<CheckRow from={check.from} key={check.name} name={check.name} />
					))}
				</div>
			</div>
		</BrowserFrame>
	);
}
