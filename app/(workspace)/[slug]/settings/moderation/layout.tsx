import { SetPageHeader } from "@/components/workspace/topbar";

interface Props {
  children: React.ReactNode;
}

export default function ModerationSettingsLayout({ children }: Props) {
  return (
    <>
      <SetPageHeader
        description="Manage post approval, spam filtering, and blocked users."
        title="Moderation"
      />
      {children}
    </>
  );
}
