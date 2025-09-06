// components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

type Variant = NonNullable<ButtonProps["variant"]>;
type Size = NonNullable<ButtonProps["size"]>;

// hoist the class maps so both the helper and component can use them
const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  default: "bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-600",
  ghost: "bg-transparent hover:bg-gray-100",
  outline: "border border-gray-300 hover:bg-gray-100",
  secondary: "bg-gray-200 hover:bg-gray-300",
  destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  link: "bg-transparent underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10",
};

// ✅ named export used by other files: class builder similar to shadcn's
export function buttonVariants(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { variant = "default", size = "default", className } = opts ?? {};
  return cn(base, variants[variant] ?? variants.default, sizes[size] ?? sizes.default, className);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  }
);
Button.displayName = "Button";

export { Button };
