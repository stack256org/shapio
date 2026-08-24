"use client";

import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEmbedConfigAction } from "@/app/actions/embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDirtyState } from "@/hooks/use-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type {
  EmbedButtonType,
  EmbedDeviceVisibility,
  EmbedFloatingIconType,
  EmbedPosition,
  EmbedStickyPosition,
  EmbedSubmitTiming,
  EmbedTheme,
} from "@/lib/embed/queries";
import { WidgetPreview } from "./widget-preview";

interface EmbedConfig {
  accentColor: string;
  buttonType: EmbedButtonType;
  deviceVisibility: EmbedDeviceVisibility;
  floatingIconType: EmbedFloatingIconType;
  floatingIconUrl: string | null;
  floatingPosition: EmbedPosition;
  height: number;
  showChangelog: boolean;
  showRoadmap: boolean;
  showSimilarPosts: boolean;
  showSubmitFormImmediately: EmbedSubmitTiming;
  showViewOtherFeedbackButton: boolean;
  stickyButtonColor: string;
  stickyButtonText: string;
  stickyPosition: EmbedStickyPosition;
  stickyTextColor: string;
  theme: EmbedTheme;
  width: number;
}

interface Props {
  appUrl: string;
  hasEmbeddableBoard: boolean;
  initialConfig: EmbedConfig;
  workspaceId: string;
  workspaceSlug: string;
}

const FLOATING_POSITION_OPTIONS: { label: string; value: EmbedPosition }[] = [
  { label: "Bottom right", value: "bottom-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Top right", value: "top-right" },
  { label: "Top left", value: "top-left" },
];

const STICKY_POSITION_OPTIONS: { label: string; value: EmbedStickyPosition }[] =
  [
    { label: "Right middle", value: "right-middle" },
    { label: "Right top", value: "right-top" },
    { label: "Right bottom", value: "right-bottom" },
    { label: "Left middle", value: "left-middle" },
    { label: "Left top", value: "left-top" },
    { label: "Left bottom", value: "left-bottom" },
  ];

const THEME_OPTIONS: { label: string; value: EmbedTheme }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto (match visitor's system)", value: "auto" },
];

const SUBMIT_TIMING_OPTIONS: { label: string; value: EmbedSubmitTiming }[] = [
  { label: "Auto", value: "auto" },
  { label: "Always", value: "always" },
  { label: "Never", value: "never" },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Every other setting is fetched live by widget.js from GET /api/embed/config
// — this is the entire, permanent install snippet. Changing anything in this
// page updates every site that has it installed, with no reinstall.
function buildSnippet(input: { appUrl: string; workspaceSlug: string }) {
  return `<script src="${input.appUrl}/widget.js" data-workspace="${input.workspaceSlug}"></script>`;
}

function CopyButton({
  className,
  disabled,
  value,
}: {
  className?: string;
  disabled?: boolean;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={copy}
      size="xs"
      type="button"
      variant="outline"
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor: string;
}) {
  return (
    <label
      className="mb-1 block text-xs font-medium text-ir-heading"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

// Section title + description above a card — the same pairing every other
// settings form on the site uses (see general-settings-form.tsx), so grouped
// config here reads as one system rather than a page-specific layout.
function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-ir-heading">{title}</h2>
      <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
    </div>
  );
}

function ToggleRow({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ir-border px-4 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ir-heading">{label}</p>
        <p className="mt-0.5 text-xs text-ir-muted">{description}</p>
      </div>
      <Switch
        checked={checked}
        className="mt-0.5"
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function DeviceVisibilityPicker({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (next: EmbedDeviceVisibility) => void;
  value: EmbedDeviceVisibility;
}) {
  const devices: {
    icon: typeof DesktopIcon;
    key: keyof EmbedDeviceVisibility;
    label: string;
  }[] = [
    { icon: DesktopIcon, key: "desktop", label: "Desktop" },
    { icon: DeviceTabletIcon, key: "tablet", label: "Tablet" },
    { icon: DeviceMobileIcon, key: "mobile", label: "Mobile" },
  ];

  return (
    <div className="flex gap-2">
      {devices.map(({ icon: Icon, key, label }) => {
        const active = value[key];
        return (
          <button
            aria-label={`${active ? "Hide" : "Show"} on ${label.toLowerCase()}`}
            aria-pressed={active}
            className={`flex size-9 cursor-pointer items-center justify-center rounded-ir-sm border transition-colors duration-150 ease-ir-standard ${
              active
                ? "border-ir-primary/40 bg-ir-primary-light/15 text-ir-primary"
                : "border-ir-border bg-ir-surface text-ir-muted hover:bg-ir-muted-surface"
            }`}
            disabled={disabled}
            key={key}
            onClick={() => onChange({ ...value, [key]: !active })}
            title={label}
            type="button"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export function EmbedSection({
  workspaceId,
  workspaceSlug,
  appUrl,
  hasEmbeddableBoard,
  initialConfig,
}: Props) {
  const [buttonType, setButtonType] = useState(initialConfig.buttonType);
  const [theme, setTheme] = useState(initialConfig.theme);
  const [width, setWidth] = useState(String(initialConfig.width));
  const [height, setHeight] = useState(String(initialConfig.height));
  const [accentColor, setAccentColor] = useState(initialConfig.accentColor);
  const [accentColorError, setAccentColorError] = useState("");
  const [floatingPosition, setFloatingPosition] = useState(
    initialConfig.floatingPosition
  );
  const [floatingIconType, setFloatingIconType] = useState(
    initialConfig.floatingIconType
  );
  const [floatingIconUrl, setFloatingIconUrl] = useState(
    initialConfig.floatingIconUrl ?? ""
  );
  const [stickyButtonText, setStickyButtonText] = useState(
    initialConfig.stickyButtonText
  );
  const [stickyButtonColor, setStickyButtonColor] = useState(
    initialConfig.stickyButtonColor
  );
  const [stickyTextColor, setStickyTextColor] = useState(
    initialConfig.stickyTextColor
  );
  const [stickyPosition, setStickyPosition] = useState(
    initialConfig.stickyPosition
  );
  const [deviceVisibility, setDeviceVisibility] = useState(
    initialConfig.deviceVisibility
  );
  const [showRoadmap, setShowRoadmap] = useState(initialConfig.showRoadmap);
  const [showChangelog, setShowChangelog] = useState(
    initialConfig.showChangelog
  );
  const [showSubmitFormImmediately, setShowSubmitFormImmediately] = useState(
    initialConfig.showSubmitFormImmediately
  );
  const [showSimilarPosts, setShowSimilarPosts] = useState(
    initialConfig.showSimilarPosts
  );
  const [showViewOtherFeedbackButton, setShowViewOtherFeedbackButton] =
    useState(initialConfig.showViewOtherFeedbackButton);
  const [isPending, startTransition] = useTransition();

  const { baseline, isDirty, markClean } = useDirtyState({
    accentColor,
    buttonType,
    deviceVisibility,
    floatingIconType,
    floatingIconUrl,
    floatingPosition,
    height,
    showChangelog,
    showRoadmap,
    showSimilarPosts,
    showSubmitFormImmediately,
    showViewOtherFeedbackButton,
    stickyButtonColor,
    stickyButtonText,
    stickyPosition,
    stickyTextColor,
    theme,
    width,
  });
  useUnsavedChangesGuard(isDirty);

  const widthNum = Number(width) || initialConfig.width;
  const heightNum = Number(height) || initialConfig.height;

  const currentConfig: EmbedConfig = {
    accentColor,
    buttonType,
    deviceVisibility,
    floatingIconType,
    floatingIconUrl: floatingIconUrl || null,
    floatingPosition,
    height: heightNum,
    showChangelog,
    showRoadmap,
    showSimilarPosts,
    showSubmitFormImmediately,
    showViewOtherFeedbackButton,
    stickyButtonColor,
    stickyButtonText,
    stickyPosition,
    stickyTextColor,
    theme,
    width: widthNum,
  };

  // Gated on there being an embeddable board — without one, the widget has
  // nothing to embed and GET /api/embed/config would 404 at runtime.
  const snippet = hasEmbeddableBoard
    ? buildSnippet({ appUrl, workspaceSlug })
    : null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setAccentColorError("");

    if (!HEX_COLOR.test(accentColor)) {
      setAccentColorError("Must be a hex color like #2563eb.");
      return;
    }

    startTransition(async () => {
      const result = await updateEmbedConfigAction({
        workspaceId,
        ...currentConfig,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Widget settings saved");
      markClean({
        accentColor,
        buttonType,
        deviceVisibility,
        floatingIconType,
        floatingIconUrl,
        floatingPosition,
        height,
        showChangelog,
        showRoadmap,
        showSimilarPosts,
        showSubmitFormImmediately,
        showViewOtherFeedbackButton,
        stickyButtonColor,
        stickyButtonText,
        stickyPosition,
        stickyTextColor,
        theme,
        width,
      });
    });
  }

  function handleDiscard() {
    setAccentColorError("");
    setButtonType(baseline.buttonType);
    setTheme(baseline.theme);
    setWidth(baseline.width);
    setHeight(baseline.height);
    setAccentColor(baseline.accentColor);
    setFloatingPosition(baseline.floatingPosition);
    setFloatingIconType(baseline.floatingIconType);
    setFloatingIconUrl(baseline.floatingIconUrl);
    setStickyButtonText(baseline.stickyButtonText);
    setStickyButtonColor(baseline.stickyButtonColor);
    setStickyTextColor(baseline.stickyTextColor);
    setStickyPosition(baseline.stickyPosition);
    setDeviceVisibility(baseline.deviceVisibility);
    setShowRoadmap(baseline.showRoadmap);
    setShowChangelog(baseline.showChangelog);
    setShowSubmitFormImmediately(baseline.showSubmitFormImmediately);
    setShowSimilarPosts(baseline.showSimilarPosts);
    setShowViewOtherFeedbackButton(baseline.showViewOtherFeedbackButton);
  }

  if (!hasEmbeddableBoard) {
    return (
      <div className="rounded-ir-card border border-dashed border-ir-border bg-ir-muted-surface p-6 text-center">
        <h2 className="text-sm font-semibold text-ir-heading">
          No public boards yet
        </h2>
        <p className="mt-1 text-xs text-ir-muted">
          The feedback widget shows one board's feedback. Create a board and
          mark it public before generating a snippet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Left — configuration, grouped into the same section+card
              pattern every other settings form on the site uses. */}
          <div className="space-y-8">
            <section>
              <SectionHeader
                description="Choose how the trigger appears on your site."
                title="Button Style"
              />
              <div className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
                <Tabs
                  onValueChange={(v) => setButtonType(v as EmbedButtonType)}
                  value={buttonType}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="floating">Floating Button</TabsTrigger>
                    <TabsTrigger value="sticky">Sticky Button</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2"
                    value="floating"
                  >
                    <div>
                      <FieldLabel htmlFor="embed-floating-position">
                        Button Position
                      </FieldLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={(v) =>
                          setFloatingPosition(v as EmbedPosition)
                        }
                        value={floatingPosition}
                      >
                        <SelectTrigger
                          className="w-full"
                          id="embed-floating-position"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FLOATING_POSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-accent">
                        Button Color
                      </FieldLabel>
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Pick button color"
                          className="h-10 w-10 shrink-0 cursor-pointer rounded-ir-input border border-ir-border bg-ir-surface p-0.5 [&::-webkit-color-swatch]:rounded-ir-sm [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-ir-sm [&::-webkit-color-swatch-wrapper]:p-0"
                          disabled={isPending}
                          onChange={(e) => setAccentColor(e.target.value)}
                          type="color"
                          value={
                            HEX_COLOR.test(accentColor)
                              ? accentColor
                              : "#111111"
                          }
                        />
                        <Input
                          className="font-mono"
                          disabled={isPending}
                          id="embed-accent"
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#2563eb"
                          value={accentColor}
                        />
                      </div>
                      {accentColorError && (
                        <p className="mt-1 text-xs text-ir-danger">
                          {accentColorError}
                        </p>
                      )}
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-floating-icon">
                        Floating Icon
                      </FieldLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={(v) =>
                          setFloatingIconType(v as EmbedFloatingIconType)
                        }
                        value={floatingIconType}
                      >
                        <SelectTrigger
                          className="w-full"
                          id="embed-floating-icon"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="logo">Shapio logo</SelectItem>
                          <SelectItem value="custom">Custom icon</SelectItem>
                        </SelectContent>
                      </Select>
                      {floatingIconType === "custom" && (
                        <Input
                          className="mt-2"
                          disabled={isPending}
                          onChange={(e) => setFloatingIconUrl(e.target.value)}
                          placeholder="https://example.com/icon.png"
                          value={floatingIconUrl}
                        />
                      )}
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-devices-floating">
                        Devices Visibility
                      </FieldLabel>
                      <DeviceVisibilityPicker
                        disabled={isPending}
                        onChange={setDeviceVisibility}
                        value={deviceVisibility}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent
                    className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2"
                    value="sticky"
                  >
                    <div>
                      <FieldLabel htmlFor="embed-sticky-text">
                        Button Text
                      </FieldLabel>
                      <Input
                        disabled={isPending}
                        id="embed-sticky-text"
                        maxLength={40}
                        onChange={(e) => setStickyButtonText(e.target.value)}
                        value={stickyButtonText}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-sticky-position">
                        Button Position
                      </FieldLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={(v) =>
                          setStickyPosition(v as EmbedStickyPosition)
                        }
                        value={stickyPosition}
                      >
                        <SelectTrigger
                          className="w-full"
                          id="embed-sticky-position"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STICKY_POSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-sticky-button-color">
                        Button Color
                      </FieldLabel>
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Pick sticky button color"
                          className="h-10 w-10 shrink-0 cursor-pointer rounded-ir-input border border-ir-border bg-ir-surface p-0.5 [&::-webkit-color-swatch]:rounded-ir-sm [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-ir-sm [&::-webkit-color-swatch-wrapper]:p-0"
                          disabled={isPending}
                          onChange={(e) => setStickyButtonColor(e.target.value)}
                          type="color"
                          value={
                            HEX_COLOR.test(stickyButtonColor)
                              ? stickyButtonColor
                              : "#111111"
                          }
                        />
                        <Input
                          className="font-mono"
                          disabled={isPending}
                          id="embed-sticky-button-color"
                          onChange={(e) => setStickyButtonColor(e.target.value)}
                          value={stickyButtonColor}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-sticky-text-color">
                        Text Color
                      </FieldLabel>
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Pick sticky text color"
                          className="h-10 w-10 shrink-0 cursor-pointer rounded-ir-input border border-ir-border bg-ir-surface p-0.5 [&::-webkit-color-swatch]:rounded-ir-sm [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-ir-sm [&::-webkit-color-swatch-wrapper]:p-0"
                          disabled={isPending}
                          onChange={(e) => setStickyTextColor(e.target.value)}
                          type="color"
                          value={
                            HEX_COLOR.test(stickyTextColor)
                              ? stickyTextColor
                              : "#ffffff"
                          }
                        />
                        <Input
                          className="font-mono"
                          disabled={isPending}
                          id="embed-sticky-text-color"
                          onChange={(e) => setStickyTextColor(e.target.value)}
                          value={stickyTextColor}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="embed-devices-sticky">
                        Devices Visibility
                      </FieldLabel>
                      <DeviceVisibilityPicker
                        disabled={isPending}
                        onChange={setDeviceVisibility}
                        value={deviceVisibility}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </section>

            <section>
              <SectionHeader
                description="Modal theme and default dimensions."
                title="Appearance"
              />
              <div className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="embed-theme">Theme</FieldLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={(v) => setTheme(v as EmbedTheme)}
                      value={theme}
                    >
                      <SelectTrigger className="w-full" id="embed-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel htmlFor="embed-width">Width (px)</FieldLabel>
                      <Input
                        disabled={isPending}
                        id="embed-width"
                        max={1200}
                        min={240}
                        onChange={(e) => setWidth(e.target.value)}
                        type="number"
                        value={width}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="embed-height">
                        Height (px)
                      </FieldLabel>
                      <Input
                        disabled={isPending}
                        id="embed-height"
                        max={1200}
                        min={240}
                        onChange={(e) => setHeight(e.target.value)}
                        type="number"
                        value={height}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionHeader
                description="Control what visitors can do inside the widget."
                title="General Options"
              />
              <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
                <ToggleRow
                  checked={showRoadmap}
                  description="Let visitors open the Roadmap from inside the widget."
                  disabled={isPending}
                  label="Show Roadmap"
                  onCheckedChange={setShowRoadmap}
                />
                <ToggleRow
                  checked={showChangelog}
                  description="Let visitors open the Changelog from inside the widget."
                  disabled={isPending}
                  label="Show Changelog"
                  onCheckedChange={setShowChangelog}
                />
                <ToggleRow
                  checked={showSimilarPosts}
                  description="Suggests existing feedback to reduce duplicates. Turn off if your feedback content is sensitive."
                  disabled={isPending}
                  label='Show "similar posts" while typing'
                  onCheckedChange={setShowSimilarPosts}
                />
                <ToggleRow
                  checked={showViewOtherFeedbackButton}
                  description="Adds a button on the success screen linking to your portal."
                  disabled={isPending}
                  label='Show "View Other Feedback" button'
                  onCheckedChange={setShowViewOtherFeedbackButton}
                />
                <div className="flex items-start justify-between gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ir-heading">
                      Show submit form immediately
                    </p>
                    <p className="mt-0.5 text-xs text-ir-muted">
                      Auto shows the form first when there's a single category
                      and no Roadmap/Changelog.
                    </p>
                  </div>
                  <Select
                    disabled={isPending}
                    onValueChange={(v) =>
                      setShowSubmitFormImmediately(v as EmbedSubmitTiming)
                    }
                    value={showSubmitFormImmediately}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBMIT_TIMING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center">
                {isDirty && (
                  <Badge className="gap-1">
                    <WarningCircleIcon weight="fill" />
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  disabled={isPending || !isDirty}
                  onClick={handleDiscard}
                  type="button"
                  variant="outline"
                >
                  Discard
                </Button>
                <Button disabled={isPending || !isDirty} type="submit">
                  {isPending ? "Saving…" : "Save Widget Settings"}
                </Button>
              </div>
            </div>
          </div>

          {/* Right — live preview. `top-24` clears the workspace Topbar
              (sticky top-0 above this in the scroll container) so the two
              don't fight for the same band while scrolling; `self-start`
              keeps this column's own height content-sized within the grid
              row so it has room to travel and unstick at the row's end. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-ir-card border border-ir-border bg-ir-surface p-4 shadow-ir-xs">
              <h3 className="text-xs font-semibold tracking-wide text-ir-heading uppercase">
                Preview
              </h3>
              <p className="mt-1 text-xs text-ir-muted">
                Click the button to preview the modal.
              </p>
              <WidgetPreview
                accentColor={accentColor}
                buttonType={buttonType}
                floatingIconType={floatingIconType}
                floatingIconUrl={floatingIconUrl}
                floatingPosition={floatingPosition}
                stickyButtonColor={stickyButtonColor}
                stickyButtonText={stickyButtonText}
                stickyPosition={stickyPosition}
                stickyTextColor={stickyTextColor}
              />
            </div>
          </div>
        </div>
      </form>

      <section>
        <div className="overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
          <div className="border-b border-ir-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ir-heading">
              Widget Installation
            </h2>
            <p className="mt-0.5 text-xs text-ir-muted">
              {snippet
                ? "Paste this where you want the widget to appear on your site. It updates live as you change the settings above."
                : "Select a board above to generate a valid embed snippet."}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-2 rounded-ir-sm border border-ir-border bg-ir-muted-surface p-3">
              <pre className="min-w-0 flex-1 font-mono text-xs break-all whitespace-pre-wrap text-ir-heading">
                {snippet ?? "// select a board to generate this snippet"}
              </pre>
              <CopyButton
                className="shrink-0"
                disabled={!snippet}
                value={snippet ?? ""}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
