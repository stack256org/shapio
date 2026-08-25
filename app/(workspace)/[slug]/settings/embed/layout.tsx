import { SetPageHeader } from "@/components/workspace/topbar";

interface Props {
  children: React.ReactNode;
}

export default function EmbedSettingsLayout({ children }: Props) {
  return (
    <>
      <SetPageHeader
        description="Add a feedback widget to your own site — inline or as a floating launcher."
        title="Embed"
      />
      {children}
    </>
  );
}
