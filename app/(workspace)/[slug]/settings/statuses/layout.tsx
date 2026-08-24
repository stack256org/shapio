interface Props {
  children: React.ReactNode;
}

export default function StatusesSettingsLayout({ children }: Props) {
  // The page header (title + description) is rendered inside StatusList so the
  // "New Status" action can sit on the same row as the title.
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
