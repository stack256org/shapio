import { describe, expect, it } from "vitest";
import {
  buildEmbedQuery,
  embedWrapperProps,
  parseEmbedParams,
} from "@/lib/embed/style";

describe("parseEmbedParams", () => {
  it("resolves isEmbed only when embed=1", () => {
    expect(parseEmbedParams({}).isEmbed).toBe(false);
    expect(parseEmbedParams({ embed: "0" }).isEmbed).toBe(false);
    expect(parseEmbedParams({ embed: "1" }).isEmbed).toBe(true);
  });

  it("accepts light and dark theme values", () => {
    expect(parseEmbedParams({ theme: "light" }).theme).toBe("light");
    expect(parseEmbedParams({ theme: "dark" }).theme).toBe("dark");
  });

  it("resolves 'auto' and unrecognized theme values to undefined", () => {
    expect(parseEmbedParams({ theme: "auto" }).theme).toBeUndefined();
    expect(parseEmbedParams({ theme: "not-a-theme" }).theme).toBeUndefined();
    expect(parseEmbedParams({}).theme).toBeUndefined();
  });

  it("accepts a bare 6-digit hex accent color and re-adds the #", () => {
    expect(parseEmbedParams({ accentColor: "2563eb" }).accentColor).toBe(
      "#2563eb"
    );
  });

  it("rejects malformed accent color values, including a leading #", () => {
    expect(
      parseEmbedParams({ accentColor: "not-a-color" }).accentColor
    ).toBeUndefined();
    expect(
      parseEmbedParams({ accentColor: "fff" }).accentColor
    ).toBeUndefined();
    expect(
      parseEmbedParams({ accentColor: "red" }).accentColor
    ).toBeUndefined();
    // A leading "#" is rejected here — the query string is expected to carry
    // the bare hex digits only (see the comment in lib/embed/style.ts).
    expect(
      parseEmbedParams({ accentColor: "#2563eb" }).accentColor
    ).toBeUndefined();
  });

  it("resolves isPanel only when embed=1 and layout=panel", () => {
    expect(parseEmbedParams({}).isPanel).toBe(false);
    expect(parseEmbedParams({ layout: "panel" }).isPanel).toBe(false);
    expect(parseEmbedParams({ embed: "1" }).isPanel).toBe(false);
    expect(parseEmbedParams({ embed: "1", layout: "panel" }).isPanel).toBe(
      true
    );
  });
});

describe("buildEmbedQuery", () => {
  it("returns an empty string when not embedded", () => {
    expect(buildEmbedQuery({ isEmbed: false, isPanel: false })).toBe("");
    expect(
      buildEmbedQuery({
        isEmbed: false,
        isPanel: false,
        theme: "dark",
        accentColor: "#111111",
      })
    ).toBe("");
  });

  it("includes only embed=1 when no theme/accent/panel is set", () => {
    expect(buildEmbedQuery({ isEmbed: true, isPanel: false })).toBe("?embed=1");
  });

  it("carries theme and accentColor forward for internal navigation, stripping the # for the query string", () => {
    const query = buildEmbedQuery({
      isEmbed: true,
      isPanel: false,
      theme: "dark",
      accentColor: "#2563eb",
    });
    const params = new URLSearchParams(query.slice(1));
    expect(params.get("embed")).toBe("1");
    expect(params.get("theme")).toBe("dark");
    expect(params.get("accentColor")).toBe("2563eb");
  });

  it("carries layout=panel forward for internal navigation when isPanel", () => {
    const query = buildEmbedQuery({ isEmbed: true, isPanel: true });
    const params = new URLSearchParams(query.slice(1));
    expect(params.get("embed")).toBe("1");
    expect(params.get("layout")).toBe("panel");
  });
});

describe("embedWrapperProps", () => {
  it("applies no class or style overrides by default", () => {
    const { className, style } = embedWrapperProps({
      isEmbed: true,
      isPanel: false,
    });
    expect(className).toBe("");
    expect(style).toEqual({});
  });

  it("applies the dark class only when theme is dark", () => {
    expect(
      embedWrapperProps({ isEmbed: true, isPanel: false, theme: "dark" })
        .className
    ).toBe("dark");
    expect(
      embedWrapperProps({ isEmbed: true, isPanel: false, theme: "light" })
        .className
    ).toBe("");
  });

  it("overrides --color-primary with the accent color and picks a legible foreground", () => {
    // A light accent color should get a dark foreground for contrast...
    const light = embedWrapperProps({
      isEmbed: true,
      isPanel: false,
      accentColor: "#f5f5f5",
    }).style as Record<string, string>;
    expect(light["--color-primary"]).toBe("#f5f5f5");
    expect(light["--color-primary-content"]).toBe("#111111");

    // ...and a dark accent color should get a light foreground.
    const dark = embedWrapperProps({
      isEmbed: true,
      isPanel: false,
      accentColor: "#111111",
    }).style as Record<string, string>;
    expect(dark["--color-primary"]).toBe("#111111");
    expect(dark["--color-primary-content"]).toBe("#ffffff");
  });
});
