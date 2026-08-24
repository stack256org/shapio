"use client";

import { ImageBrokenIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteWorkspaceAction,
  updateWorkspaceInfoAction,
  updateWorkspaceSettingsAction,
} from "@/app/actions/workspace-settings";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { ContentContainer } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { countCharacters } from "@/lib/text-metrics";

interface GeneralSettingsFormProps {
  canManage: boolean;
  changelogPublic: boolean;
  isOwner: boolean;
  // Public Portal origin — where this workspace's board/roadmap/changelog live.
  portalUrl: string;
  roadmapPublic: boolean;
  workspaceDescription: string;
  workspaceId: string;
  workspaceLogoUrl: string;
  workspaceName: string;
  workspaceSlug: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-ir-border px-4 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ir-heading">{label}</p>
        <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
      </div>
      <Switch
        checked={checked}
        className="mt-0.5"
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-ir-heading">{title}</h2>
      <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
    </div>
  );
}

function LogoPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-ir-sm border border-ir-border bg-ir-muted-surface">
      {trimmed && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        // biome-ignore lint/performance/noImgElement: user-provided logo URL, not known at build time for next/image
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError/onLoad track load-failure state, not user interaction
        <img
          alt="Workspace logo preview"
          className="size-full object-cover"
          key={trimmed}
          onError={() => setFailed(true)}
          onLoad={() => setFailed(false)}
          src={trimmed}
        />
      ) : (
        <ImageBrokenIcon className="size-4 text-ir-muted" />
      )}
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  description,
  children,
  error,
}: {
  label: string;
  htmlFor: string;
  description?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 border-b border-ir-border py-3 last:border-0 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
      <div>
        <label
          className="mt-0.5 block text-sm font-medium text-ir-heading"
          htmlFor={htmlFor}
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
        )}
      </div>
      <div>
        {children}
        {error && <p className="mt-1 text-xs text-ir-danger">{error}</p>}
      </div>
    </div>
  );
}

export function GeneralSettingsForm({
  workspaceId,
  workspaceSlug,
  workspaceName,
  workspaceDescription,
  workspaceLogoUrl,
  portalUrl,
  roadmapPublic,
  changelogPublic,
  canManage,
  isOwner,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRoadmapPending, startRoadmapTransition] = useTransition();
  const [isChangelogPending, startChangelogTransition] = useTransition();

  // Info form state
  const [name, setName] = useState(workspaceName);
  const [slug, setSlug] = useState(workspaceSlug);
  const [description, setDescription] = useState(workspaceDescription);
  const [logoUrl, setLogoUrl] = useState(workspaceLogoUrl);
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const { isDirty: infoDirty, markClean: markInfoClean } = useDirtyState({
    name,
    slug,
    description,
    logoUrl,
  });
  useUnsavedChangesGuard(infoDirty);

  // Delete workspace state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();

  // Public URL previews (slug / roadmap / changelog) live on the Public Portal
  // host, which is passed in from the server — not this admin page's own origin.
  const appUrl = portalUrl;

  function handleRoadmapToggle(value: boolean) {
    startRoadmapTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        roadmapPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public roadmap enabled" : "Public roadmap disabled"
      );
      router.refresh();
    });
  }

  function handleChangelogToggle(value: boolean) {
    startChangelogTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        changelogPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public changelog enabled" : "Public changelog disabled"
      );
      router.refresh();
    });
  }

  function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoErrors({});

    startTransition(async () => {
      const result = await updateWorkspaceInfoAction({
        workspaceId,
        name: name.trim() === workspaceName ? undefined : name.trim(),
        slug: slug.trim() === workspaceSlug ? undefined : slug.trim(),
        description:
          description.trim() === workspaceDescription
            ? undefined
            : description.trim() || null,
        logoUrl:
          logoUrl.trim() === workspaceLogoUrl
            ? undefined
            : logoUrl.trim() || null,
      });

      if (!result.success) {
        if (result.field) {
          setInfoErrors({ [result.field]: result.error });
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success("Workspace info saved");
      markInfoClean({ name, slug, description, logoUrl });

      // If slug changed, navigate to new URL
      if (result.data.newSlug && result.data.newSlug !== workspaceSlug) {
        router.push(`/${result.data.newSlug}/settings/general`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDeleteConfirm() {
    startDeleteTransition(async () => {
      const result = await deleteWorkspaceAction({
        workspaceId,
        workspaceSlug,
        confirmName: deleteConfirmName,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Workspace deleted");
      router.push("/onboarding");
    });
  }

  return (
    <ContentContainer className="space-y-10">
      {/* Workspace Info */}
      <section>
        <SectionHeader
          description="Update your workspace name, URL, and branding."
          title="Workspace info"
        />
        <form onSubmit={handleSaveInfo}>
          <div className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
            <FormField error={infoErrors.name} htmlFor="ws-name" label="Name">
              <Input
                disabled={!canManage || isPending}
                id="ws-name"
                maxLength={64}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                value={name}
              />
            </FormField>

            <FormField
              description="Changing this updates all existing links."
              error={infoErrors.slug}
              htmlFor="ws-slug"
              label="URL"
            >
              <div className="flex items-center">
                <span className="inline-flex h-10 shrink-0 items-center rounded-l-ir-input border border-r-0 border-ir-border bg-ir-muted-surface px-2.5 text-xs text-ir-muted">
                  {appUrl}/
                </span>
                <Input
                  className="flex-1 rounded-l-none"
                  disabled={!canManage || isPending}
                  id="ws-slug"
                  maxLength={48}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  pattern="[a-z0-9][a-z0-9\-]*[a-z0-9]"
                  placeholder="my-workspace"
                  value={slug}
                />
              </div>
            </FormField>

            <FormField
              error={infoErrors.description}
              htmlFor="ws-description"
              label="Description"
            >
              <Textarea
                disabled={!canManage || isPending}
                id="ws-description"
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your workspace…"
                rows={3}
                value={description}
              />
              <p className="mt-1 text-right text-xs text-ir-muted">
                {countCharacters(description)}/300
              </p>
            </FormField>

            <FormField
              description="Link to a publicly accessible image."
              error={infoErrors.logoUrl}
              htmlFor="ws-logo"
              label="Logo URL"
            >
              <div className="flex items-center gap-3">
                <LogoPreview url={logoUrl} />
                <Input
                  className="flex-1"
                  disabled={!canManage || isPending}
                  id="ws-logo"
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  type="url"
                  value={logoUrl}
                />
              </div>
            </FormField>
          </div>

          {canManage && (
            <div className="mt-3 flex justify-end">
              <Button disabled={isPending || !infoDirty} type="submit">
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* Visibility */}
      <section>
        <SectionHeader
          description="Control what the public can see."
          title="Visibility"
        />
        <div className="rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <ToggleRow
            checked={roadmapPublic}
            description={`Show your roadmap at ${appUrl}/${workspaceSlug}/roadmap.`}
            disabled={isRoadmapPending || !canManage}
            label="Public Roadmap"
            onChange={handleRoadmapToggle}
          />
          <ToggleRow
            checked={changelogPublic}
            description={`Show your changelog at ${appUrl}/${workspaceSlug}/changelog.`}
            disabled={isChangelogPending || !canManage}
            label="Public Changelog"
            onChange={handleChangelogToggle}
          />
        </div>
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section>
          <SectionHeader
            description="Irreversible and destructive actions."
            title="Danger zone"
          />
          <div className="rounded-ir-card border border-ir-danger/30 bg-ir-danger/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ir-heading">
                  Delete workspace
                </p>
                <p className="mt-0.5 text-xs text-ir-muted">
                  Permanently delete this workspace and all its data. This
                  cannot be undone.
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                type="button"
                variant="destructive"
              >
                Delete workspace
              </Button>
            </div>
          </div>
        </section>
      )}

      {!canManage && (
        <p className="text-xs text-ir-muted">
          Only owners and admins can change workspace settings.
        </p>
      )}
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete workspace"
        description={`This will permanently delete "${workspaceName}" and all its boards, posts, comments, and members. Type the workspace name to confirm.`}
        isPending={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setDeleteConfirmName("");
          }
        }}
        open={showDeleteDialog}
        title="Delete workspace"
        variant="destructive"
      >
        <Input
          autoComplete="off"
          className="mt-3"
          onChange={(e) => setDeleteConfirmName(e.target.value)}
          placeholder={workspaceName}
          value={deleteConfirmName}
        />
      </ConfirmDialog>
    </ContentContainer>
  );
}
