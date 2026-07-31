import { RolodexFlip } from "../../components/remocn/rolodex-flip";
import { bar, beat, palette, Scene } from "./shared";

/**
 * Cold open. No logo, no product — just the moment every developer knows.
 * One rolodex chain so both lines arrive with the exact same flip:
 * blank → "tuesday, 4:12 pm." → "you ship a deploy."
 */
export function HookScene() {
	return (
		<Scene>
			<div
				style={{
					alignItems: "center",
					color: palette.text,
					display: "flex",
					fontSize: 68,
					fontWeight: 600,
					inset: 0,
					justifyContent: "center",
					letterSpacing: "-0.02em",
					position: "absolute",
				}}
			>
				<RolodexFlip
					flipDuration={beat(0.75)}
					from={beat(0.75)}
					interval={bar(1)}
					items={["", "tuesday, 4:12 pm.", "you ship a deploy."]}
				/>
			</div>
		</Scene>
	);
}
