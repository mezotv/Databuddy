"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { NoticeBanner } from "@/app/(main)/websites/_components/notice-banner";
import { WebsiteDialog } from "@/components/website-dialog";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
	updateWebsiteCache,
	useDeleteWebsite,
	useWebsite,
	type Website,
} from "@/hooks/use-websites";
import { orpc } from "@/lib/orpc";
import { TOAST_MESSAGES } from "../../_components/constants/settings-constants";
import {
	CheckIcon,
	ClipboardIcon,
	InfoIcon,
	PencilSimpleIcon,
	WarningCircleIcon,
} from "@databuddy/ui/icons";
import { DeleteDialog, Switch } from "@databuddy/ui/client";
import {
	Badge,
	Button,
	SettingCard,
	SettingCardGroup,
	SettingsZone,
	SettingsZoneRow,
} from "@databuddy/ui";

export default function GeneralSettingsPage() {
	const params = useParams();
	const router = useRouter();
	const websiteId = params.id as string;
	const { data: websiteData, refetch } = useWebsite(websiteId);
	const deleteWebsiteMutation = useDeleteWebsite();
	const queryClient = useQueryClient();

	const [showEditDialog, setShowEditDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const toggleMutation = useMutation({
		...orpc.websites.togglePublic.mutationOptions(),
		onSuccess: (updatedWebsite: Website) => {
			updateWebsiteCache(queryClient, updatedWebsite);
		},
	});

	const { isCopied: copiedId, copyToClipboard: copyId } = useCopyToClipboard({
		onCopy: () => toast.success("Client ID copied to clipboard"),
	});
	const { isCopied: copiedLink, copyToClipboard: copyLink } =
		useCopyToClipboard({
			onCopy: () => toast.success("Link copied to clipboard!"),
		});

	const isPublic = websiteData?.isPublic ?? false;
	const shareableLink = websiteData
		? `${window.location.origin}/public/${websiteId}`
		: "";

	const handleWebsiteUpdated = useCallback(() => {
		setShowEditDialog(false);
		refetch();
	}, [refetch]);

	const handleDeleteWebsite = useCallback(async () => {
		if (!websiteData) {
			return;
		}
		try {
			await toast.promise(
				deleteWebsiteMutation.mutateAsync({ id: websiteId }),
				{
					loading: TOAST_MESSAGES.WEBSITE_DELETING,
					success: () => {
						router.push("/websites");
						return TOAST_MESSAGES.WEBSITE_DELETED;
					},
					error: TOAST_MESSAGES.WEBSITE_DELETE_ERROR,
				}
			);
		} catch {
			// handled by toast
		}
	}, [websiteData, websiteId, deleteWebsiteMutation, router]);

	const handleTogglePublic = useCallback(() => {
		if (!websiteData) {
			return;
		}
		toast.promise(
			toggleMutation.mutateAsync({ id: websiteId, isPublic: !isPublic }),
			{
				loading: "Updating privacy settings...",
				success: "Privacy settings updated",
				error: "Failed to update privacy settings",
			}
		);
	}, [websiteData, websiteId, isPublic, toggleMutation]);

	if (!websiteData) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="mx-auto max-w-2xl space-y-6 p-5">
				<SettingCardGroup>
					<SettingCard
						description={
							<code className="font-mono text-[11px]">{websiteId}</code>
						}
						title="Client ID"
					>
						<Button
							onClick={() => copyId(websiteId)}
							size="sm"
							variant="secondary"
						>
							{copiedId ? (
								<>
									<CheckIcon className="size-3.5" weight="bold" />
									Copied
								</>
							) : (
								<>
									<ClipboardIcon className="size-3.5" weight="duotone" />
									Copy
								</>
							)}
						</Button>
					</SettingCard>
					<SettingCard description={websiteData.name || "Not set"} title="Name">
						<Button
							onClick={() => setShowEditDialog(true)}
							size="sm"
							variant="secondary"
						>
							<PencilSimpleIcon className="size-3.5" />
							Edit
						</Button>
					</SettingCard>
					<SettingCard
						description={websiteData.domain || "Not set"}
						title="Domain"
					>
						<Button
							onClick={() => setShowEditDialog(true)}
							size="sm"
							variant="secondary"
						>
							<PencilSimpleIcon className="size-3.5" />
							Edit
						</Button>
					</SettingCard>
				</SettingCardGroup>

				<SettingCardGroup>
					<SettingCard
						description="Anyone with the link sees the overview only — no settings or other tabs"
						expandable={
							isPublic ? (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<p className="font-medium text-sm">Public overview link</p>
										<Badge variant="muted">Read-only</Badge>
									</div>
									<div className="flex items-center gap-2">
										<code className="flex-1 overflow-x-auto break-all rounded border bg-secondary px-3 py-2 font-mono text-xs">
											{shareableLink}
										</code>
										<Button
											aria-label="Copy public overview link"
											onClick={() => copyLink(shareableLink)}
											size="sm"
											variant="ghost"
										>
											{copiedLink ? (
												<CheckIcon
													className="size-4 text-success"
													weight="bold"
												/>
											) : (
												<ClipboardIcon className="size-4" />
											)}
										</Button>
									</div>
									<NoticeBanner
										description="This URL opens your public overview only. Visitors cannot access settings, other analytics sections, or delete your site."
										icon={<InfoIcon />}
									/>
								</div>
							) : undefined
						}
						title="Public sharing"
					>
						<Switch
							aria-label="Toggle public access"
							checked={isPublic}
							onCheckedChange={handleTogglePublic}
						/>
					</SettingCard>
				</SettingCardGroup>

				<SettingsZone title="Destructive actions" variant="destructive">
					<SettingsZoneRow
						action={{
							label: "Transfer",
							onClick: () =>
								router.push(`/websites/${websiteId}/settings/transfer`),
						}}
						description="Move to another organization"
						title="Transfer website"
					/>
					<SettingsZoneRow
						action={{
							label: "Delete",
							onClick: () => setShowDeleteDialog(true),
						}}
						description="Permanently delete this website and all its data"
						title="Delete website"
					/>
				</SettingsZone>
			</div>

			<WebsiteDialog
				onOpenChange={setShowEditDialog}
				onSave={handleWebsiteUpdated}
				open={showEditDialog}
				website={websiteData}
			/>
			<DeleteDialog
				confirmLabel="Delete Website"
				description={`Are you sure you want to delete ${websiteData.name || websiteData.domain}?`}
				isDeleting={deleteWebsiteMutation.isPending}
				isOpen={showDeleteDialog}
				itemName={websiteData.name || websiteData.domain}
				onClose={() => setShowDeleteDialog(false)}
				onConfirm={handleDeleteWebsite}
				title="Delete Website"
			>
				<div className="rounded border bg-secondary p-3 text-sm">
					<div className="flex items-start gap-2">
						<WarningCircleIcon className="size-5 shrink-0 text-destructive" />
						<div className="space-y-1">
							<p className="font-medium">Warning:</p>
							<ul className="list-disc space-y-1 pl-4 text-xs">
								<li>All analytics data will be permanently deleted</li>
								<li>Tracking will stop immediately</li>
								<li>All website settings will be lost</li>
							</ul>
						</div>
					</div>
				</div>
			</DeleteDialog>
		</div>
	);
}
