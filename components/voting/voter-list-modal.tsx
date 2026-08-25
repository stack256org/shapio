"use client";

import { UserCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RelativeTime } from "@/components/ui/relative-time";

interface Voter {
  email: string | null;
  id: string;
  image: string | null;
  isGuest: boolean;
  name: string | null;
  votedAt: string;
}

interface VoterListModalProps {
  onClose: () => void;
  postId: string;
  voteCount: number;
}

export default function VoterListModal({
  postId,
  voteCount,
  onClose,
}: VoterListModalProps) {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [total, setTotal] = useState(voteCount);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initial load
  useEffect(() => {
    loadVoters(1);
  }, []);

  async function loadVoters(p: number) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/posts/${postId}/vote/voters?page=${p}&limit=50`
      );
      if (!res.ok) {
        setError("Failed to load voters.");
        return;
      }
      const data: { voters: Voter[]; total: number } = await res.json();
      setTotal(data.total);
      setVoters((prev) => (p === 1 ? data.voters : [...prev, ...data.voters]));
      setHasMore(data.voters.length === 50);
      setPage(p);
    } catch {
      setError("Failed to load voters.");
    } finally {
      setIsLoading(false);
    }
  }

  function loadMore() {
    loadVoters(page + 1);
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voters</DialogTitle>
          <DialogDescription>
            {total} {total === 1 ? "person" : "people"} voted on this post
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 min-h-0 flex-1 overflow-y-auto border-t border-ir-border">
          {isLoading && voters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ir-muted">Loading…</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ir-danger">{error}</p>
            </div>
          ) : voters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-ir-muted">No voters yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ir-border">
              {voters.map((voter) => (
                <li
                  className="flex items-center gap-3 px-6 py-3"
                  key={voter.id}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ir-muted-surface">
                    {voter.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      // biome-ignore lint/performance/noImgElement: voter-provided avatar URL, not known at build time for next/image
                      <img
                        alt={voter.name ?? ""}
                        className="size-full object-cover"
                        src={voter.image}
                      />
                    ) : (
                      <UserCircleIcon className="size-3.5 text-ir-muted" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm text-ir-heading">
                        {voter.name ?? voter.email ?? "Unknown"}
                      </span>
                    </div>
                    {voter.name && voter.email && (
                      <p className="truncate text-xs text-ir-muted">
                        {voter.email}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-ir-muted">
                    <RelativeTime
                      date={voter.votedAt}
                      options={{ addSuffix: true }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="border-t border-ir-border px-6 py-3">
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={loadMore}
                size="sm"
                variant="ghost"
              >
                {isLoading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
