import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import {
	AbsoluteFill,
	Easing,
	Img,
	interpolate,
	Sequence,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";
import { databuddyFontFamily } from "../../fonts";

/**
 * The file name says 120 BPM, but the decoded track measures 105 BPM.
 * Keep fractional timing here and round only at frame boundaries so the
 * minute-long edit does not drift away from the music.
 */
export const VIDEO_FPS = 30;
export const TRACK_BPM = 105;
export const BEAT = (VIDEO_FPS * 60) / TRACK_BPM;
export const BAR = BEAT * 4;
export const beat = (n: number) => Math.round(n * BEAT);
export const bar = (n: number) => Math.round(n * BAR);

/**
 * First strong measured downbeat after the track's quiet intro (9.169s).
 */
export const AUDIO_OFFSET = 275;

export const palette = {
	accent: "#7C86FF",
	amber: "#E3A514",
	bg: "#0A0A0C",
	border: "rgba(231,232,235,0.09)",
	cyan: "#38BDF8",
	green: "#38D996",
	muted: "#8B8D93",
	red: "#F87171",
	surface: "#111114",
	surface2: "#16161B",
	text: "#E7E8EB",
} as const;

export const github = {
	bg: "#0d1117",
	blue: "#58a6ff",
	border: "#30363d",
	diffAddBg: "rgba(46,160,67,0.15)",
	diffAddText: "#3fb950",
	diffDelBg: "rgba(248,81,73,0.15)",
	diffDelText: "#f85149",
	green: "#238636",
	muted: "#8b949e",
	surface: "#161b22",
	text: "#e6edf3",
} as const;

export const monoFont =
	'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace';

export const easeInOut = Easing.inOut(Easing.cubic);

/** Eased 0→1 progress starting at `from`, lasting `duration` frames. */
export function progress(frame: number, from = 0, duration = 20) {
	return interpolate(frame, [from, from + duration], [0, 1], {
		easing: easeInOut,
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
}

export function pop(frame: number, fps: number, from = 0) {
	return spring({
		config: { damping: 20, mass: 0.8, stiffness: 150 },
		fps,
		frame: Math.max(0, frame - from),
	});
}

/** Entrance style: rise + fade, ease-in-out, starting at `from` (frames). */
export function riseIn(
	frame: number,
	_fps: number,
	from = 0,
	distance = 24
): CSSProperties {
	const p = progress(frame, from, 20);
	return {
		opacity: p,
		transform: `translateY(${(1 - p) * distance}px)`,
	};
}

/**
 * Scene canvas: dark product background, brand font, and a subtle full-frame
 * scale pulse on every bar downbeat so the whole video breathes with the track.
 */
/**
 * The one background used across the entire video: dark ink + the brand
 * gradient (same as the opening frame), with a continuous slow drift.
 * `offset` desynchronizes nothing — every scene uses identical settings so
 * cuts feel like one continuous world.
 */
export function Backdrop() {
	const frame = useCurrentFrame();
	const bgScale = 1.1 + 0.05 * Math.sin(frame / 85);
	const bgX = 34 * Math.sin(frame / 110);
	const bgY = 24 * Math.cos(frame / 140);
	const bgRotate = 1.4 * Math.sin(frame / 190);

	return (
		<AbsoluteFill style={{ backgroundColor: palette.bg }}>
			<Img
				src={staticFile("gradient-bg-1.webp")}
				style={{
					height: "120%",
					left: "-10%",
					opacity: 0.5,
					position: "absolute",
					top: "-10%",
					transform: `scale(${bgScale}) translate(${bgX}px, ${bgY}px) rotate(${bgRotate}deg)`,
					width: "120%",
				}}
			/>
		</AbsoluteFill>
	);
}

export function Scene({
	children,
	style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
	return (
		<AbsoluteFill
			style={{
				color: palette.text,
				fontFamily: databuddyFontFamily,
				overflow: "hidden",
				...style,
			}}
		>
			<Backdrop />
			<AbsoluteFill>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
}

/**
 * Title-first scene layout as ONE continuous scroll: the headline owns the
 * full frame for `hold` frames, then the title glides up and off while the
 * content slides up from below the frame — a single cubic ease-in-out move.
 * Content mounts when the scroll starts, so its internal timings are local
 * to the reveal.
 */
/** One size for every full-frame text card so consecutive cards never jump. */
export const CARD_SIZE = 68;

export function TitleReveal({
	children,
	hold,
	outro,
	outroAt,
	outroSize = CARD_SIZE,
	size = CARD_SIZE,
	slide = 24,
	title,
}: PropsWithChildren<{
	hold: number;
	outro?: ReactNode;
	outroAt?: number;
	outroSize?: number;
	size?: number;
	slide?: number;
	title: string;
}>) {
	const frame = useCurrentFrame();
	// no opacity fade at the cut — the card is fully visible on the downbeat
	// and does a small settle, so cuts never dip to black
	const enter = progress(frame, 0, 10);
	const p = progress(frame, hold, slide);
	// same duration as the intro scroll; the text leads the content slightly
	// so the frame is never empty mid-transition
	const p2 =
		outro && outroAt !== undefined ? progress(frame, outroAt, slide) : 0;

	return (
		<>
			<AbsoluteFill
				style={{
					transform: `translateY(${(1 - p) * 1080 - p2 * 1080}px)`,
				}}
			>
				{frame >= hold ? <Sequence from={hold}>{children}</Sequence> : null}
			</AbsoluteFill>
			<AbsoluteFill
				style={{
					alignItems: "center",
					display: "flex",
					justifyContent: "center",
					transform: `translateY(${p * -1140}px)`,
				}}
			>
				<div
					style={{
						fontSize: size,
						fontWeight: 600,
						letterSpacing: "-0.02em",
						textAlign: "center",
						transform: `translateY(${(1 - enter) * 14}px)`,
					}}
				>
					{title}
				</div>
			</AbsoluteFill>
			{outro ? (
				<AbsoluteFill
					style={{
						alignItems: "center",
						display: "flex",
						justifyContent: "center",
						transform: `translateY(${(1 - p2) * 940}px)`,
					}}
				>
					<div
						style={{
							fontSize: outroSize,
							fontWeight: 600,
							letterSpacing: "-0.02em",
							textAlign: "center",
						}}
					>
						{outro}
					</div>
				</AbsoluteFill>
			) : null}
		</>
	);
}

/** Simple eased count-up with tabular digits — no odometer overflow. */
export function CountUp({
	color = palette.text,
	duration = 50,
	fontSize,
	from = 0,
	to,
}: {
	color?: string;
	duration?: number;
	fontSize: number;
	from?: number;
	to: number;
}) {
	const frame = useCurrentFrame();
	const value = Math.round(to * progress(frame, from, duration));

	return (
		<span
			style={{
				color,
				fontSize,
				fontVariantNumeric: "tabular-nums",
				fontWeight: 600,
				letterSpacing: "-0.01em",
			}}
		>
			{value.toLocaleString("en-US")}
		</span>
	);
}

/**
 * Camera rig: keyframed zoom/pan over the wrapped content.
 * `keyframes` are scene-local frames; `scale`/`y` are sampled against them
 * with a smooth ease so the move reads as a dolly, not a jump.
 */
export function Camera({
	children,
	keyframes,
	origin = "50% 50%",
	scale,
	y,
}: PropsWithChildren<{
	keyframes: number[];
	origin?: string;
	scale: number[];
	y?: number[];
}>) {
	const frame = useCurrentFrame();
	const ease = (t: number) => t * t * (3 - 2 * t);
	const zoom = interpolate(frame, keyframes, scale, {
		easing: ease,
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const pan = y
		? interpolate(frame, keyframes, y, {
				easing: ease,
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			})
		: 0;

	return (
		<AbsoluteFill
			style={{
				transform: `scale(${zoom}) translateY(${pan}px)`,
				transformOrigin: origin,
			}}
		>
			{children}
		</AbsoluteFill>
	);
}

/** Left-aligned scene headline. Sentence case, no tricks. */
export function Headline({
	children,
	from = 0,
	size = 58,
	style,
}: PropsWithChildren<{ from?: number; size?: number; style?: CSSProperties }>) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				fontSize: size,
				fontWeight: 600,
				left: 100,
				letterSpacing: "-0.02em",
				position: "absolute",
				top: 72,
				...riseIn(frame, fps, from),
				...style,
			}}
		>
			{children}
		</div>
	);
}

/**
 * Cinematic subtitle: centered at the bottom, full-brightness, with a soft
 * shadow so it reads over any content. `accent` is unused visually but kept
 * so call sites can hint tone without breaking.
 */
export function Caption({
	accent: _accent = palette.accent,
	children,
	from = 0,
	style,
}: PropsWithChildren<{
	accent?: string;
	from?: number;
	style?: CSSProperties;
}>) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				bottom: 72,
				color: palette.text,
				fontSize: 36,
				fontWeight: 500,
				left: 0,
				letterSpacing: "-0.01em",
				position: "absolute",
				textAlign: "center",
				textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 0 44px rgba(0,0,0,0.6)",
				width: "100%",
				...riseIn(frame, fps, from, 16),
				...style,
			}}
		>
			{children}
		</div>
	);
}

/** Rounded product-style panel. */
export function Panel({
	children,
	from = 0,
	style,
}: PropsWithChildren<{ from?: number; style?: CSSProperties }>) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				backgroundColor: palette.surface,
				border: `1px solid ${palette.border}`,
				borderRadius: 16,
				position: "absolute",
				...riseIn(frame, fps, from),
				...style,
			}}
		>
			{children}
		</div>
	);
}

/** macOS-style browser window with a URL bar. */
export function BrowserFrame({
	children,
	chrome = palette.surface2,
	from = 0,
	style,
	url,
}: PropsWithChildren<{
	chrome?: string;
	from?: number;
	style?: CSSProperties;
	url: string;
}>) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				borderRadius: 18,
				boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				position: "absolute",
				...style,
				...riseIn(frame, fps, from, 18),
			}}
		>
			<div
				style={{
					alignItems: "center",
					backgroundColor: chrome,
					borderBottom: `1px solid ${palette.border}`,
					display: "flex",
					flexShrink: 0,
					gap: 8,
					height: 52,
					padding: "0 20px",
				}}
			>
				{["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
					<div
						key={c}
						style={{
							backgroundColor: c,
							borderRadius: 6,
							height: 12,
							opacity: 0.85,
							width: 12,
						}}
					/>
				))}
				<div
					style={{
						alignItems: "center",
						backgroundColor: "rgba(255,255,255,0.06)",
						borderRadius: 8,
						color: palette.muted,
						display: "flex",
						fontFamily: monoFont,
						fontSize: 16,
						height: 32,
						justifyContent: "center",
						margin: "0 auto",
						maxWidth: 640,
						padding: "0 24px",
						transform: "translateX(-32px)",
						width: "52%",
					}}
				>
					{url}
				</div>
			</div>
			<div style={{ flex: 1, position: "relative" }}>{children}</div>
		</div>
	);
}
