import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_EMBED_CONFIG,
  getEmbedConfig,
  upsertEmbedConfig,
} from "@/lib/embed/queries";
import { createTestUser, createTestWorkspace } from "../setup/fixtures";
import { resetDb } from "../setup/reset-db";

beforeEach(async () => {
  await resetDb();
});

describe("getEmbedConfig", () => {
  it("returns null when a workspace has never saved embed settings", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    expect(await getEmbedConfig(ws.id)).toBeNull();
  });
});

describe("upsertEmbedConfig", () => {
  it("creates a config row on first save", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    const saved = await upsertEmbedConfig(ws.id, {
      ...DEFAULT_EMBED_CONFIG,
      buttonType: "sticky",
      floatingPosition: "top-left",
      theme: "dark",
      width: 420,
      height: 600,
      accentColor: "#2563eb",
    });

    expect(saved.workspaceId).toBe(ws.id);
    expect(saved.buttonType).toBe("sticky");
    expect(saved.floatingPosition).toBe("top-left");
    expect(saved.theme).toBe("dark");
    expect(saved.width).toBe(420);
    expect(saved.height).toBe(600);
    expect(saved.accentColor).toBe("#2563eb");

    const fetched = await getEmbedConfig(ws.id);
    expect(fetched).toMatchObject({
      workspaceId: ws.id,
      buttonType: "sticky",
      floatingPosition: "top-left",
      theme: "dark",
      width: 420,
      height: 600,
      accentColor: "#2563eb",
    });
  });

  it("overwrites the existing row on a second save rather than creating a new one", async () => {
    const owner = await createTestUser();
    const ws = await createTestWorkspace(owner.id, owner.email);

    await upsertEmbedConfig(ws.id, {
      ...DEFAULT_EMBED_CONFIG,
      buttonType: "floating",
      floatingPosition: "bottom-right",
      theme: "light",
      width: 380,
      height: 560,
      accentColor: "#111111",
    });
    await upsertEmbedConfig(ws.id, {
      ...DEFAULT_EMBED_CONFIG,
      buttonType: "sticky",
      floatingPosition: "bottom-left",
      theme: "auto",
      width: 500,
      height: 700,
      accentColor: "#ff0000",
    });

    const fetched = await getEmbedConfig(ws.id);
    expect(fetched).toMatchObject({
      buttonType: "sticky",
      floatingPosition: "bottom-left",
      theme: "auto",
      width: 500,
      height: 700,
      accentColor: "#ff0000",
    });
  });

  it("scopes config to its own workspace", async () => {
    const owner = await createTestUser();
    const wsA = await createTestWorkspace(owner.id, owner.email);
    const wsB = await createTestWorkspace(owner.id, owner.email);

    await upsertEmbedConfig(wsA.id, {
      ...DEFAULT_EMBED_CONFIG,
      accentColor: "#111111",
    });

    expect(await getEmbedConfig(wsB.id)).toBeNull();
    expect((await getEmbedConfig(wsA.id))?.accentColor).toBe("#111111");
  });
});
