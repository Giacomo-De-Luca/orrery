interface StatusLayoutProps {
  children: React.ReactNode;
}

export function StatusLayout({ children }: StatusLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}
