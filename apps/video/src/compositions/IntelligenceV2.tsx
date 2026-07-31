import { Audio } from "@remotion/media";
import { interpolate, Series, staticFile } from "remotion";
import { BuildScene } from "./intelligence/BuildScene";
import { ConnectScene } from "./intelligence/ConnectScene";
import { DashboardScene } from "./intelligence/DashboardScene";
import { HookScene } from "./intelligence/HookScene";
import { InsightsScene } from "./intelligence/InsightsScene";
import { InvestigationScene } from "./intelligence/InvestigationScene";
import { OutroScene } from "./intelligence/OutroScene";
import { PullRequestScene } from "./intelligence/PullRequestScene";
import { AUDIO_OFFSET, bar } from "./intelligence/shared";

/**
 * One story, told in order: you ship → it breaks → databuddy notices →
 * investigates → opens the fix → the metric recovers → product reveal → CTA.
 */
const scenePlan = [
	{ component: HookScene, bars: 2 },
	{ component: DashboardScene, bars: 3 },
	{ component: InsightsScene, bars: 3 },
	{ component: InvestigationScene, bars: 4 },
	{ component: PullRequestScene, bars: 4 },
	{ component: BuildScene, bars: 4 },
	{ component: ConnectScene, bars: 3 },
	{ component: OutroScene, bars: 3 },
];

let elapsedBars = 0;
export const intelligenceV2Scenes = scenePlan.map((scene) => {
	const start = bar(elapsedBars);
	elapsedBars += scene.bars;
	return {
		...scene,
		durationInFrames: bar(elapsedBars) - start,
	};
});

/** 26 bars @ 105 BPM = 1783 frames = 59.4s. */
export const intelligenceV2DurationInFrames = bar(elapsedBars);
const finalBarDuration = bar(elapsedBars) - bar(elapsedBars - 1);

export function IntelligenceV2() {
	return (
		<>
			<Audio
				src={staticFile("120bpm-audio.mp3")}
				trimBefore={AUDIO_OFFSET}
				volume={(frame) =>
					interpolate(
						frame,
						[
							0,
							intelligenceV2DurationInFrames - finalBarDuration,
							intelligenceV2DurationInFrames,
						],
						[0.78, 0.78, 0],
						{
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}
					)
				}
			/>
			<Series>
				{intelligenceV2Scenes.map(
					({ component: Component, durationInFrames }) => (
						<Series.Sequence
							durationInFrames={durationInFrames}
							key={Component.name}
							name={Component.name}
						>
							<Component />
						</Series.Sequence>
					)
				)}
			</Series>
		</>
	);
}
