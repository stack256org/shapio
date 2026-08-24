import { SetPageHeader } from "@/components/workspace/topbar";

interface Props {
  children: React.ReactNode;
}

export default function GeneralSettingsLayout({ children }: Props) {
  return (
    <>
      <SetPageHeader
        description="Manage workspace-wide settings and visibility."
        title="General"
      />
      {children}
    </>
  );
}
