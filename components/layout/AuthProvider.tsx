"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const isEmailAllowed = (email: string | null | undefined) => {
    if (!email) return false;
    if (allowedEmails.length === 0) return true;
    return allowedEmails.includes(email.toLowerCase());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !isEmailAllowed(firebaseUser.email)) {
        void signOut(auth);
        setUser(null);
        setLoading(false);
        toast.error("This account is not authorized to access this app.");
        if (pathname !== "/login") {
          router.push("/login");
        }
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser && pathname !== "/login") {
        router.push("/login");
      } else if (firebaseUser && pathname === "/login") {
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!isEmailAllowed(result.user.email)) {
        await signOut(auth);
        throw new Error("This account is not authorized to access this app.");
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
