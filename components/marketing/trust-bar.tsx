const CLAIMS = [
  "Voters never pay a seat fee",
  "Feedback connects to your roadmap",
  "Voters notified automatically on ship",
  "Self-hosted or fully managed",
] as const;

export function TrustBar() {
  return (
    <div className="border-y border-base-300">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-px bg-base-300 sm:grid-cols-4">
          {CLAIMS.map((claim) => (
            <div className="bg-base-200 px-6 py-5 text-center" key={claim}>
              <p className="text-xs font-semibold uppercase tracking-ui text-base-content/60">
                {claim}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
