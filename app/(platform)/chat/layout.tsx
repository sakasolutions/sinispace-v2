// Chat Layout - Kein Wrapper mehr nötig, Chat-Seiten rendern ihre eigene Sidebar
// Die globale App-Sidebar kommt von platform-layout-content.tsx
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  // Security Check wird bereits in platform-layout.tsx gemacht
  // Chat-Seiten rendern ihre eigene Chat-Liste Sidebar
  return <>{children}</>;
}
