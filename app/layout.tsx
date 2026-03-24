import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/layout/AuthProvider";

export const metadata: Metadata = {
  title: "GymPro — Trainer Dashboard",
  description: "Manage memberships, track members, send reminders and payments",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(220 13% 10%)",
                border: "1px solid hsl(220 10% 16%)",
                color: "hsl(0 0% 95%)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
