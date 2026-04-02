/**
 * Utility functions for client-side input validation
 * Provides common regex patterns and validation logic for various input fields.
 */

export const ValidationPatterns = {
  // Alphanumeric with spaces, hyphens, and underscores.
  fullName: /^[a-zA-Z0-9_\-\s]{3,50}$/,
  
  // Basic email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Rejects strings containing common HTML script tags or JavaScript URI vectors
  denyScriptTags: /<\s*script.*?>|<\s*\/\s*script\s*>/i,
  denyJavascriptURI: /javascript\s*:/i,
};

const COMMON_WEAK_PASSWORDS = new Set([
  "password123", "password", "12345678", "123456789", "qwerty", 
  "1234567", "admin123", "admin", "letmein123", "welcome", "iloveyou"
]);

export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required.";
  if (!ValidationPatterns.email.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
};

export const validateFullName = (name: string): string | null => {
  if (!name) return "Full Name is required.";
  if (name.trim().length < 3) return "Name must be at least 3 characters long.";
  if (!ValidationPatterns.fullName.test(name)) {
    return "Name contains invalid characters.";
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required.";
  
  // Reject universally common passwords directly
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "This password is too easily guessed. Please choose a more secure password.";
  }

  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) return "Password must be at least 8 characters long.";
  if (!hasUpper) return "Password must contain at least one uppercase letter.";
  if (!hasLower) return "Password must contain at least one lowercase letter.";
  if (!hasNumber) return "Password must contain at least one number.";
  if (!hasSpecial) return "Password must contain at least one special character (!@#$%^&*).";
  
  return null;
};

export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  // Strip out any primitive XSS injection components as a baseline
  return input
    .replace(ValidationPatterns.denyScriptTags, "")
    .replace(ValidationPatterns.denyJavascriptURI, "");
};
