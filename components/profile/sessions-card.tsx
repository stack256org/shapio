"use client";

import {
  DeviceMobileIcon,
  DeviceTabletIcon,
  MonitorIcon,
} from "@phosphor-icons/react";
import {
  revokeSessionAction,
  signOutOtherSessionsAction,
} from "@/app/actions/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export interface SessionRow {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  userAgent: string | null;
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  if (!userAgent) {
    return <MonitorIcon className="size-4 text-ir-muted" />;
  }
  if (/iPhone|iPad|Android/i.test(userAgent)) {
    return /iPad/i.test(userAgent) ? (
      <DeviceTabletIcon className="size-4 text-ir-muted" />
    ) : (
      <DeviceMobileIcon className="size-4 text-ir-muted" />
    );
  }
  return <MonitorIcon className="size-4 text-ir-muted" />;
}

function describeUserAgent(userAgent: string) {
  const browser = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(userAgent)
      ? "macOS"
      : /iPhone/i.test(userAgent)
        ? "iPhone"
        : /iPad/i.test(userAgent)
          ? "iPad"
          : /Android/i.test(userAgent)
            ? "Android"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : "";
  return os ? `${browser} on ${os}` : browser;
}

function truncateIp(ip: string) {
  if (ip.length <= 20) {
    return ip;
  }
  return `${ip.slice(0, 18)}…`;
}

export function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ir-heading">
            Active Sessions
          </h2>
          <p className="mt-0.5 text-xs text-ir-muted">
            Devices and browsers currently signed in to your account.
          </p>
        </div>
        {otherSessionCount > 0 && (
          <form action={signOutOtherSessionsAction}>
            <Button size="sm" type="submit" variant="secondary">
              Sign out other sessions
            </Button>
          </form>
        )}
      </div>

      <div className="divide-y divide-ir-border overflow-hidden rounded-ir-card border border-ir-border bg-ir-surface shadow-ir-xs">
        {sessions.length === 0 && (
          <p className="py-6 text-center text-sm text-ir-muted">
            No active sessions found.
          </p>
        )}
        {sessions.map((session) => (
          <div className="flex items-center gap-3 px-4 py-3.5" key={session.id}>
            {/* Device icon */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-ir-sm bg-ir-muted-surface">
              <DeviceIcon userAgent={session.userAgent} />
            </div>

            {/* Session details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ir-heading">
                  {session.userAgent
                    ? describeUserAgent(session.userAgent)
                    : "Unknown device"}
                </span>
                {session.isCurrent && (
                  <Badge className="shrink-0 text-ir-success">Current</Badge>
                )}
              </div>
              <p className="mt-1 max-w-full truncate text-xs text-ir-muted">
                {session.userAgent ?? "No user agent recorded"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ir-muted">
                {session.ipAddress && (
                  <span className="font-mono" title={session.ipAddress}>
                    {truncateIp(session.ipAddress)}
                  </span>
                )}
                {session.ipAddress && <span>·</span>}
                <span>Signed in {formatDateTime(session.createdAt)}</span>
                <span>·</span>
                <span>Expires {formatDateTime(session.expiresAt)}</span>
              </div>
            </div>

            {/* Action */}
            <div className="shrink-0">
              {session.isCurrent ? (
                <span className="rounded-ir-sm bg-ir-muted-surface px-3 py-2 text-xs font-medium text-nowrap text-ir-muted">
                  Protected
                </span>
              ) : (
                <form action={revokeSessionAction}>
                  <input name="sessionId" type="hidden" value={session.id} />
                  <Button size="sm" type="submit" variant="secondary">
                    Revoke
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
