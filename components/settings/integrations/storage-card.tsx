"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  testStorageConnectionAction,
  updateStorageSettingsAction,
} from "@/app/actions/integration-settings";
import { Callout } from "@/components/settings/integrations/callout";
import { Field, FormGrid } from "@/components/settings/integrations/field";
import { SaveBar } from "@/components/settings/integrations/save-bar";
import { SecretField } from "@/components/settings/integrations/secret-field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDirtyState } from "@/hooks/use-dirty-state";
import {
  type IntegrationSettingsStatus,
  UNCHANGED_SECRET,
} from "@/lib/integration-settings-types";
import { cn } from "@/lib/utils";

interface StorageCardProps {
  onDirtyChange?: (dirty: boolean) => void;
  status: IntegrationSettingsStatus["storage"];
}

type StorageType = "local" | "r2" | "s3";

const STORAGE_TYPE_OPTIONS: {
  hint: string;
  label: string;
  value: StorageType;
}[] = [
  {
    value: "local",
    label: "Local disk",
    hint: "No setup required. Fine for a single-server deployment.",
  },
  {
    value: "s3",
    label: "Amazon S3",
    hint: "Store uploads in an AWS S3 bucket.",
  },
  {
    value: "r2",
    label: "Cloudflare R2",
    hint: "S3-compatible storage on Cloudflare's network.",
  },
];

function inferStorageType(status: StorageCardProps["status"]): StorageType {
  const hasS3Fields = !!(
    status.region ||
    status.bucket ||
    status.accessKeyId ||
    status.hasSecretAccessKey ||
    status.endpoint
  );
  if (!hasS3Fields) {
    return "local";
  }
  return status.endpoint || status.region === "auto" ? "r2" : "s3";
}

function StorageCardImpl({ status, onDirtyChange }: StorageCardProps) {
  const [isSaving, startSave] = useTransition();
  const [isTesting, startTest] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const [storageType, setStorageType] = useState<StorageType>(() =>
    inferStorageType(status)
  );
  const [region, setRegion] = useState(status.region);
  const [bucket, setBucket] = useState(status.bucket);
  const [accessKeyId, setAccessKeyId] = useState(status.accessKeyId);
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [secretCleared, setSecretCleared] = useState(false);
  const [endpoint, setEndpoint] = useState(status.endpoint);
  const [publicUrlBase, setPublicUrlBase] = useState(status.publicUrlBase);
  const [localDir, setLocalDir] = useState(status.localDir);

  const { baseline, isDirty, markClean } = useDirtyState({
    storageType,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    secretCleared,
    endpoint,
    publicUrlBase,
    localDir,
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!justSaved) {
      return;
    }
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  function secretValue() {
    return secretCleared ? "" : secretAccessKey.trim() || UNCHANGED_SECRET;
  }

  // The type picker is purely a client-side view over the same six fields —
  // there's no separate "storage type" column. Choosing Local and saving
  // clears the S3/R2 fields (an explicit, informed switch — see the warning
  // callout below); choosing S3 clears a leftover R2 endpoint so it can't
  // silently point an AWS bucket at the wrong host.
  function buildPayload() {
    if (storageType === "local") {
      return {
        region: "",
        bucket: "",
        accessKeyId: "",
        secretAccessKey: "",
        endpoint: "",
        publicUrlBase: "",
        localDir,
      };
    }
    return {
      region: storageType === "r2" ? "" : region,
      bucket,
      accessKeyId,
      secretAccessKey: secretValue(),
      endpoint: storageType === "r2" ? endpoint : "",
      publicUrlBase,
      localDir,
    };
  }

  function handleSave() {
    startSave(async () => {
      try {
        const result = await updateStorageSettingsAction(buildPayload());

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setSecretAccessKey("");
        setSecretCleared(false);
        markClean({
          storageType,
          region,
          bucket,
          accessKeyId,
          secretAccessKey: "",
          secretCleared: false,
          endpoint,
          publicUrlBase,
          localDir,
        });
        setJustSaved(true);
      } catch {
        toast.error(
          "Couldn't reach the server. Check your connection and try again."
        );
      }
    });
  }

  function handleDiscard() {
    setStorageType(baseline.storageType);
    setRegion(baseline.region);
    setBucket(baseline.bucket);
    setAccessKeyId(baseline.accessKeyId);
    setSecretAccessKey(baseline.secretAccessKey);
    setSecretCleared(baseline.secretCleared);
    setEndpoint(baseline.endpoint);
    setPublicUrlBase(baseline.publicUrlBase);
    setLocalDir(baseline.localDir);
  }

  function handleTest() {
    startTest(async () => {
      try {
        const result = await testStorageConnectionAction({
          region,
          bucket,
          accessKeyId,
          secretAccessKey: secretValue(),
          endpoint: storageType === "r2" ? endpoint : "",
        });

        if (!result.success) {
          toast.error(`Connection failed: ${result.error}`);
          return;
        }
        toast.success("Bucket reachable");
      } catch {
        toast.error(
          "Couldn't reach the server. Check your connection and try again."
        );
      }
    });
  }

  const initialHadS3Data = !!(
    status.region ||
    status.bucket ||
    status.accessKeyId ||
    status.hasSecretAccessKey ||
    status.endpoint
  );
  const willClearS3OnSave = storageType === "local" && initialHadS3Data;

  const testDisabled =
    storageType === "r2"
      ? !(bucket && accessKeyId && endpoint)
      : !(region && bucket && accessKeyId);

  return (
    <div>
      <RadioGroup
        className="grid gap-2.5 sm:grid-cols-3"
        onValueChange={(value) => setStorageType(value as StorageType)}
        value={storageType}
      >
        {STORAGE_TYPE_OPTIONS.map((option) => (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-ir-md border p-3 transition-colors duration-150 ease-ir-standard",
              storageType === option.value
                ? "border-ir-primary bg-ir-primary/5"
                : "border-ir-border hover:border-ir-primary/40"
            )}
            htmlFor={`storage-type-${option.value}`}
            key={option.value}
          >
            <RadioGroupItem
              className="mt-0.5"
              id={`storage-type-${option.value}`}
              value={option.value}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ir-heading">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-ir-muted">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {willClearS3OnSave && (
        <Callout className="mt-3" variant="warning">
          Switching to local disk will clear your saved S3/R2 credentials when
          you save — you'll need to re-enter them to switch back.
        </Callout>
      )}

      <div className="mt-4">
        {storageType === "local" && (
          <Field
            hint="Only used while S3/R2 is unconfigured."
            htmlFor="storage-local-dir"
            label="Local storage directory"
          >
            <Input
              id="storage-local-dir"
              onChange={(e) => setLocalDir(e.target.value)}
              placeholder="public/uploads (default)"
              value={localDir}
            />
          </Field>
        )}

        {storageType !== "local" && (
          <FormGrid>
            {storageType === "s3" ? (
              <Field htmlFor="storage-region" label="Region" required>
                <Input
                  id="storage-region"
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="us-east-1"
                  value={region}
                />
              </Field>
            ) : (
              <Field htmlFor="storage-endpoint" label="Endpoint" required>
                <Input
                  id="storage-endpoint"
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://<account-id>.r2.cloudflarestorage.com"
                  value={endpoint}
                />
              </Field>
            )}

            <Field htmlFor="storage-bucket" label="Bucket" required>
              <Input
                id="storage-bucket"
                onChange={(e) => setBucket(e.target.value)}
                placeholder="shapio-uploads"
                value={bucket}
              />
            </Field>

            <Field
              htmlFor="storage-access-key-id"
              label="Access key ID"
              required
            >
              <Input
                autoComplete="off"
                id="storage-access-key-id"
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIA…"
                value={accessKeyId}
              />
            </Field>

            <SecretField
              cleared={secretCleared}
              fromEnv={status.secretAccessKeyFromEnv}
              hasValue={status.hasSecretAccessKey}
              id="storage-secret-access-key"
              label="Secret access key"
              onChange={setSecretAccessKey}
              onClear={() => {
                setSecretCleared(true);
                setSecretAccessKey("");
              }}
              required
              value={secretAccessKey}
            />

            <Field
              className="sm:col-span-2"
              hint="Leave blank to derive it automatically from region + bucket."
              htmlFor="storage-public-url-base"
              label="Public URL base"
            >
              <Input
                id="storage-public-url-base"
                onChange={(e) => setPublicUrlBase(e.target.value)}
                placeholder="https://shapio-uploads.s3.us-east-1.amazonaws.com"
                value={publicUrlBase}
              />
            </Field>
          </FormGrid>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        isTesting={isTesting}
        justSaved={justSaved}
        onDiscard={handleDiscard}
        onSave={handleSave}
        onTest={storageType === "local" ? undefined : handleTest}
        testDisabled={testDisabled}
      />
    </div>
  );
}

export const StorageCard = memo(StorageCardImpl);
