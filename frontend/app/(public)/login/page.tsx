"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, resetPassword, signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      // Let AuthContext handle redirect
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Invalid credentials. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Router resolves in AuthContext
    } catch (error) {
      console.error("Google sign in failed:", error);
      alert("Google sign in failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    
    try {
      await resetPassword(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error) {
      console.error("Failed to send reset email:", error);
      alert("Failed to send reset email. Verify your email address.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-surface text-on-surface">
      {/* Main Content Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px] space-y-12">
          
          {/* Branding Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            <Logo className="mb-4 scale-150 transform justify-center text-on-surface" />
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold editorial-tight text-on-surface">
                TrueCost Rent
              </h1>
              <p className="text-on-surface-variant font-medium text-sm label-refined">
                Transparency in Renting
              </p>
            </div>
          </div>

          {/* Login Form */}
          <section className="space-y-8">
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold label-refined text-on-surface-variant px-1" htmlFor="email">
                  Email Address
                </label>
                <div className="bg-surface-container-low rounded-lg transition-colors focus-within:bg-surface-container-high border border-transparent focus-within:border-secondary">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="no-line-input w-full bg-transparent px-4 py-4 text-on-surface placeholder:text-outline/50 focus:ring-0"
                    placeholder="name@firm.com"
                    autoComplete="username"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-bold label-refined text-on-surface-variant" htmlFor="password">
                    Security Cipher
                  </label>
                  <button onClick={handleForgotPassword} type="button" className="text-[10px] font-bold label-refined text-on-primary-container hover:text-primary transition-colors">
                    Forgot Password?
                  </button>
                </div>
                {resetSent && <p className="text-xs text-primary px-1">Reset email sent!</p>}
                <div className="bg-surface-container-low rounded-lg transition-colors focus-within:bg-surface-container-high border border-transparent focus-within:border-secondary">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="no-line-input w-full bg-transparent px-4 py-4 text-on-surface placeholder:text-outline/50 focus:ring-0"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-secondary text-on-secondary font-bold py-4 rounded-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all editorial-tight text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">
                        progress_activity
                      </span>
                      Authenticating
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/20"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold label-refined uppercase">
                    <span className="bg-surface px-4 text-outline/60">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-surface-container-low text-on-surface border border-outline-variant/30 font-bold py-4 rounded-lg shadow-sm hover:bg-surface-container-high active:scale-[0.98] transition-all editorial-tight text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
              </div>
            </form>

            {/* Auxiliary Actions */}
            <div className="flex flex-col items-center space-y-6 pt-4">
              <div className="w-full flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
                <span className="text-[10px] font-bold label-refined text-outline/60">New User?</span>
                <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
              </div>
              <Link href="/request-access" className="group flex items-center gap-2 text-sm font-semibold text-primary transition-all">
                <span>Create an Account</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </section>

          {/* Standard Footer */}
          <footer className="pt-12 mt-12 border-t border-outline-variant/20 flex flex-col justify-between items-center gap-6 text-on-surface-variant">
            <div className="text-xs font-medium text-center">
              © 2024 TrueCost Rent
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-[11px] font-semibold text-outline tracking-wide">
              <Link className="hover:text-primary transition-colors" href="/legal?tab=terms">Terms of Service</Link>
              <Link className="hover:text-primary transition-colors" href="/legal?tab=privacy">Privacy Policy</Link>
              <Link className="hover:text-primary transition-colors" href="/support">Help</Link>
            </div>
          </footer>
        </div>
      </main>

      {/* Side Visual Anchor (Editorial Style) */}
      <aside className="hidden lg:flex w-1/3 xl:w-2/5 bg-surface-container-lowest relative overflow-hidden flex-col justify-end p-16">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-black label-refined rounded-full">
            Market Update
          </div>
          <h2 className="text-5xl xl:text-6xl font-black editorial-tight text-on-surface leading-[1.1]">
            Transparency is the new <span className="text-secondary">Standard.</span>
          </h2>
          <p className="text-on-surface-variant text-lg max-w-md font-medium leading-relaxed">
            Utilizing proprietary algorithms to calculate the exact fiscal impact of every lease agreement in the domestic market.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-8">
            <div className="space-y-1">
              <p className="text-3xl font-black editorial-tight text-on-surface">24.8%</p>
              <p className="text-[10px] font-bold label-refined text-outline">Avg. Hidden Fees</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-black editorial-tight text-on-surface">$1.2B</p>
              <p className="text-[10px] font-bold label-refined text-outline">Assets Tracked</p>
            </div>
          </div>
        </div>
        
        {/* Abstract Decorative Element */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-surface-container-high rounded-full blur-3xl opacity-40 mix-blend-multiply"></div>
      </aside>
    </div>
  );
}
