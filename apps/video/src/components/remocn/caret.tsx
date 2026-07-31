"use client";

import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export interface CaretProps {
	blink?: boolean;
	blinkPerSecond?: number;
	className?: string;
	color?: string;
	height?: number;
	marginLeft?: number;
	opacity?: number;
	radius?: number;
	speed?: number;
	style?: CSSProperties;
	width?: number;
}

export function caretBlinkOpacity(
	frame: number,
	opts: { fps: number; blinkPerSecond: number; speed: number }
): number {
	const cycles = opts.blinkPerSecond <= 0 ? 1 : opts.blinkPerSecond;
	const halfPeriod = opts.fps / cycles / 2;
	if (halfPeriod <= 0) {
		return 1;
	}
	return Math.floor((frame * opts.speed) / halfPeriod) % 2 === 0 ? 1 : 0;
}

export function Caret({
	color = "currentColor",
	width = 2,
	height = 18,
	radius = 1,
	opacity,
	blink = false,
	blinkPerSecond = 1,
	speed = 1,
	marginLeft = 0,
	className,
	style,
}: CaretProps) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const resolvedOpacity =
		opacity === undefined
			? blink
				? caretBlinkOpacity(frame, { fps, blinkPerSecond, speed })
				: 1
			: opacity;

	return (
		<span
			className={className}
			style={{
				display: "inline-block",
				flexShrink: 0,
				width,
				height,
				borderRadius: radius,
				background: color,
				opacity: resolvedOpacity,
				marginLeft,
				...style,
			}}
		/>
	);
}
