import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { boards } from "@/db/schema/boards";
import { workspaces } from "@/db/schema/workspaces";

// "inline" (grows with the page, no modal) is gone — every widget is a
// modal now, triggered by one of these two button types. Floating is the
// default for every new/migrated workspace.
export type EmbedButtonType = "floating" | "sticky";
export type EmbedPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";
export type EmbedStickyPosition =
  | "left-top"
  | "left-middle"
  | "left-bottom"
  | "right-top"
  | "right-middle"
  | "right-bottom";
export type EmbedFloatingIconType = "logo" | "custom";
export type EmbedTheme = "light" | "dark" | "auto";
export type EmbedSubmitTiming = "auto" | "always" | "never";

export interface EmbedDeviceVisibility {
  desktop: boolean;
  mobile: boolean;
  tablet: boolean;
}

export const DEFAULT_DEVICE_VISIBILITY: EmbedDeviceVisibility = {
  desktop: true,
  mobile: true,
  tablet: true,
};

export const workspaceEmbedConfig = pgTable("workspace_embed_config", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  // Which board the snippet embeds. Nullable: a workspace might not have a
  // public board yet, and the board can be deleted after being configured
  // here — the embed settings UI falls back to the first public board when
  // this is unset. Without a board, the generated snippet has nothing valid
  // to point at (there's no "all boards" public route to fall back to).
  boardId: text("board_id").references(() => boards.id, {
    onDelete: "set null",
  }),
  buttonType: text("button_type")
    .$type<EmbedButtonType>()
    .notNull()
    .default("floating"),
  theme: text("theme").$type<EmbedTheme>().notNull().default("light"),
  width: integer("width").notNull().default(380),
  height: integer("height").notNull().default(560),
  accentColor: text("accent_color").notNull().default("#111111"),

  // Floating button
  floatingPosition: text("floating_position")
    .$type<EmbedPosition>()
    .notNull()
    .default("bottom-right"),
  floatingIconType: text("floating_icon_type")
    .$type<EmbedFloatingIconType>()
    .notNull()
    .default("logo"),
  // Only meaningful when floatingIconType === "custom" — a plain image URL
  // rather than its own upload pipeline, matching how accentColor is just a
  // hex value rather than a color-picker asset.
  floatingIconUrl: text("floating_icon_url"),

  // Sticky button
  stickyButtonText: text("sticky_button_text").notNull().default("Leave Feedback"),
  stickyButtonColor: text("sticky_button_color").notNull().default("#111111"),
  stickyTextColor: text("sticky_text_color").notNull().default("#ffffff"),
  stickyPosition: text("sticky_position")
    .$type<EmbedStickyPosition>()
    .notNull()
    .default("right-middle"),

  // Shared by both button types
  deviceVisibility: jsonb("device_visibility")
    .$type<EmbedDeviceVisibility>()
    .notNull()
    .default(DEFAULT_DEVICE_VISIBILITY),
  showRoadmap: boolean("show_roadmap").notNull().default(true),
  showChangelog: boolean("show_changelog").notNull().default(true),
  showSubmitFormImmediately: text("show_submit_form_immediately")
    .$type<EmbedSubmitTiming>()
    .notNull()
    .default("auto"),
  showSimilarPosts: boolean("show_similar_posts").notNull().default(true),
  showViewOtherFeedbackButton: boolean("show_view_other_feedback_button")
    .notNull()
    .default(true),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
