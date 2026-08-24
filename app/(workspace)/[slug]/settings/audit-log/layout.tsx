import { SetPageHeader } from "@/components/workspace/topbar";

interface Props {
  children: React.ReactNode;
}

export default function AuditLogSettingsLayout({ children }: Props) {
  return (
    <>
      <SetPageHeader
        description="A record of all actions taken in this workspace."
        title="Audit Log"
      />
      {children}
    </>
  );
}
