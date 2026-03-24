"use client";

import { useState } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { Dumbbell, Chrome, Flame, Zap } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Logo area */}
        <div className="text-center mb-10 animate-[fade-in_0.5s_ease-out_forwards]">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 glow-orange">
            <Dumbbell className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl text-foreground tracking-widest mb-2">
            GYMPRO
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Trainer Command Center
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 animate-[fade-in_0.5s_ease-out_0.1s_forwards] opacity-0">
          {[
            { icon: Flame, text: "Member Tracking" },
            { icon: Zap, text: "Auto Reminders" },
            { icon: Chrome, text: "Payment QR" },
          ].map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border"
            >
              <Icon className="w-3 h-3 text-primary" />
              {text}
            </span>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 animate-[fade-in_0.5s_ease-out_0.2s_forwards] opacity-0">
          <h2 className="font-display text-2xl text-foreground tracking-widest mb-1">
            SIGN IN
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Access your trainer dashboard
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-white/10"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Trainer access only · Secured by Firebase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
