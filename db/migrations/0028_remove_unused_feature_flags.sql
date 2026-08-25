-- The public_roadmap, public_changelog, and changelog_rss platform flags were
-- never actually checked anywhere in app code — the public roadmap/changelog
-- features are controlled entirely by each workspace's own settings, not this
-- platform-wide flag. Removed from DEFAULT_FEATURE_FLAGS (lib/orbit/feature-flags.ts)
-- so they stop re-seeding; this deletes the existing rows so they also stop
-- showing up in the Feature Flags admin page.
DELETE FROM "feature_flags" WHERE "key" IN ('public_roadmap', 'public_changelog', 'changelog_rss');
