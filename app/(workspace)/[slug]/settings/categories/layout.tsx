interface Props {
  children: React.ReactNode;
}

export default function CategoriesSettingsLayout({ children }: Props) {
  // The page header (title + description) is rendered inside CategoryList so the
  // "New Category" action can sit on the same row as the title.
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
