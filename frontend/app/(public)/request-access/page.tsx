"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { validatePassword, validateEmail, validateFullName } from "@/utils/validation";

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    firmName: "",
    role: "",
    useCase: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; fullName?: string }>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { signInWithGoogle, signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const emailErr = validateEmail(formData.email);
    const nameErr = validateFullName(formData.fullName);
    setFieldErrors({ email: emailErr || undefined, fullName: nameErr || undefined });
    
    if (emailErr || nameErr) return;

    const errorMsg = validatePassword(formData.password);
    if (errorMsg) {
      setPasswordError(errorMsg);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError(null);
    setIsSubmitting(true);
    
    try {
      await signUp(formData.email, formData.password, formData.fullName);
      // AuthContext handles redirect
      // Optionally sync role, firmName, useCase to Firestore backend here
    } catch (error) {
      console.error("Failed to create account:", error);
      alert("Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // AuthContext will handle redirect
    } catch (error) {
      console.error("Google sign up failed:", error);
      alert("Google sign up failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface text-on-background min-h-screen selection:bg-secondary-container flex flex-col">
      <main className="flex-1 flex flex-col md:flex-row min-h-screen">
        {/* Left Section: High-Impact Editorial Copy */}
        <section className="md:w-5/12 bg-primary-container relative flex flex-col justify-between p-12 overflow-hidden">
          {/* Background Texture */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ backgroundImage: "linear-gradient(135deg, #0A192F 0%, #0D1C32 100%)" }}
          />
          
          {/* Branding */}
          <div className="relative z-10 flex items-center gap-3 text-on-primary">
            <Logo className="origin-left scale-110" />
          </div>

          {/* Copy */}
          <div className="relative z-10 space-y-8 my-auto py-12 md:py-0">
            <h1 className="text-4xl md:text-6xl font-extrabold text-on-primary tracking-tight leading-tight">
              Transparency <br />in Renting.
            </h1>
            <p className="text-on-primary-container text-lg max-w-md font-medium leading-relaxed">
              Join the new standard in real estate intelligence. Access precision-grade pricing insights, true monthly cost calculations, and comprehensive market reports.
            </p>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex flex-col">
                <span className="text-secondary-fixed-dim text-2xl font-bold tracking-tighter">-0.02em</span>
                <span className="text-on-primary-container text-[10px] uppercase tracking-widest font-bold">Standard Deviation</span>
              </div>
              <div className="w-px h-10 bg-on-primary-container/20"></div>
              <div className="flex flex-col">
                <span className="text-secondary-fixed-dim text-2xl font-bold tracking-tighter">99.8%</span>
                <span className="text-on-primary-container text-[10px] uppercase tracking-widest font-bold">Data Fidelity</span>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <div className="relative z-10 text-[10px] uppercase tracking-[0.2em] text-on-primary-container/60 font-bold hidden md:block">
            TrueCost Rent © 2025
          </div>
        </section>

        {/* Right Section: Registration Form */}
        <section className="md:w-7/12 bg-surface flex items-center justify-center p-8 md:p-20">
          <div className="w-full max-w-xl">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Create Your Account</h2>
              <p className="text-on-surface-variant font-medium">Join TrueCost Rent to securely access true market intelligence.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grid for Name/Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="fullName">
                    Full Name
                  </label>
                  <input 
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container-low border ${fieldErrors.fullName ? 'border-primary' : 'border-transparent'} rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white`} 
                    placeholder="Alexander Hamilton" 
                    type="text" 
                  />
                  {fieldErrors.fullName && <p className="text-xs text-primary font-medium px-1">{fieldErrors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="email">
                    Email Address
                  </label>
                  <input 
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container-low border ${fieldErrors.email ? 'border-primary' : 'border-transparent'} rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white`} 
                    placeholder="name@firm.com" 
                    type="email" 
                  />
                  {fieldErrors.email && <p className="text-xs text-primary font-medium px-1">{fieldErrors.email}</p>}
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="password">
                    Password
                  </label>
                  <input 
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container-low border ${passwordError ? 'border-primary' : 'border-transparent'} rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white`} 
                    placeholder="••••••••" 
                    type="password" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input 
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container-low border ${passwordError === "Passwords do not match." ? 'border-primary' : 'border-transparent'} rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white`} 
                    placeholder="••••••••" 
                    type="password" 
                  />
                </div>
              </div>
              {passwordError && <p className="text-xs text-primary font-medium">{passwordError}</p>}

              {/* Firm Info */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="firmName">
                  Company / Organization (Optional)
                </label>
                <input 
                  id="firmName"
                  name="firmName"
                  value={formData.firmName}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-low border-transparent rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white" 
                  placeholder="e.g. Acme Corp" 
                  type="text" 
                />
              </div>

              {/* Role Dropdown */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="role">
                  Professional Role
                </label>
                <div className="relative">
                  <select 
                    id="role"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full bg-surface-container-low border-transparent rounded-lg px-4 py-3 text-on-surface appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white"
                  >
                    <option disabled value="">Select your role...</option>
                    <option value="Renter">Renter</option>
                    <option value="Real Estate Investor">Real Estate Investor</option>
                    <option value="Property Manager">Property Manager</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm" aria-hidden="true">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="useCase">
                  How will you use TrueCost?
                </label>
                <textarea 
                  id="useCase"
                  name="useCase"
                  required
                  value={formData.useCase}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-low border-transparent rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 resize-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary focus:bg-white" 
                  placeholder="Briefly describe your analytical requirements..." 
                  rows={4} 
                />
              </div>

              {/* Actions */}
              <div className="pt-6 space-y-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-secondary text-on-secondary font-bold py-4 rounded-lg tracking-tight hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">
                        progress_activity
                      </span>
                      Submitting...
                    </>
                  ) : (
                    "Create Account"
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
                  onClick={handleGoogleSignUp}
                  disabled={isSubmitting}
                  className="w-full bg-surface-container-low text-on-surface border border-outline-variant/30 font-bold py-4 rounded-lg shadow-sm hover:bg-surface-container-high active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Sign up with Google
                </button>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                  <Link href="/login" className="text-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors group">
                    <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform" aria-hidden="true">
                      arrow_back
                    </span>
                    Back to Sign In
                  </Link>
                  <p className="text-[10px] text-on-surface-variant max-w-[200px] text-center md:text-right leading-tight">
                    By creating an account, you agree to our Terms of Service.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Standard Footer Text */}
      <footer className="bg-surface-container-low py-12 px-6 md:px-12 w-full mt-auto border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-on-surface-variant">
          <div className="text-xs font-medium text-center md:text-left">
            © 2024 TrueCost Rent
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-8 text-[11px] font-semibold text-outline tracking-wide">
            <Link className="hover:text-primary transition-colors" href="/legal?tab=terms">Terms of Service</Link>
            <Link className="hover:text-primary transition-colors" href="/legal?tab=privacy">Privacy Policy</Link>
            <Link className="hover:text-primary transition-colors" href="/support">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
