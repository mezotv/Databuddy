import { Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SoftBlurIn } from "../../components/remocn/soft-blur-in";
import { beat, palette, progress, Scene } from "./shared";

export function OutroScene() {
	const frame = useCurrentFrame();
	// visible at the cut, small settle only — no dark dip after the card before it
	const logo = progress(frame, 0, 12);
	// plain fade, only after the headline has fully settled
	const sub = progress(frame, beat(6), 20);

	return (
		<Scene>
			<Img
				src={staticFile("primary-logo-white.svg")}
				style={{
					left: "50%",
					position: "absolute",
					top: 360,
					transform: `translateX(-50%) translateY(${(1 - logo) * 14}px)`,
					width: 360,
				}}
			/>
			<Sequence from={beat(1)}>
				<div style={{ inset: 0, position: "absolute", top: 310 }}>
					<SoftBlurIn
						color={palette.text}
						fontSize={68}
						fontWeight={600}
						text="introducing databuddy intelligence."
					/>
				</div>
			</Sequence>
			<div
				style={{
					color: palette.muted,
					fontSize: 28,
					fontWeight: 500,
					left: 0,
					opacity: sub,
					position: "absolute",
					textAlign: "center",
					top: 800,
					width: "100%",
				}}
			>
				analytics that works on your product · app.databuddy.cc
			</div>
		</Scene>
	);
}
