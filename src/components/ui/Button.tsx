import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost';
    isLoading?: boolean;
    href?: string;
}

export function Button({
    children,
    variant = 'primary',
    isLoading,
    className = '',
    disabled,
    href,
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 min-h-[44px]";

    const variants = {
        primary: "tracking-wide text-white bg-gradient-to-br from-glow via-flare to-sun",
        ghost: "border border-white/15 text-white/80 hover:border-white/40 hover:text-white"
    };

    const classes = `${baseStyles} ${variants[variant]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }

    return (
        <button
            className={classes}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
}
