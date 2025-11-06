export const validateEmail = (email: string): string | undefined => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return undefined;
};

export const validatePassword = (password: string): string | undefined => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return undefined;
};

export interface FieldErrors {
  [key: string]: string | undefined;
}

export const validateFields = (
  values: Record<string, unknown>,
  rules: Record<string, (value: any) => string | undefined>
): FieldErrors => {
  const errors: FieldErrors = {};
  for (const key of Object.keys(rules)) {
    const error = rules[key](values[key]);
    if (error) errors[key] = error;
  }
  return errors;
};


