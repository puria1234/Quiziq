import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'panel' | 'simple';
}

export function Card({ children, variant = 'panel', className = '', ...props }: CardProps) {
    const baseStyles = "rounded-3xl p-6 md:p-8";

    // .gradient-panel
    const panelStyles = "bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] border border-white/10 shadow-[0_25px_60px_rgba(11,11,20,0.7)] backdrop-blur-[18px]";

    // .quiz-card / simple container
    const simpleStyles = "rounded-2xl border border-white/10 bg-white/5 p-5";

    const selectedStyle = variant === 'panel' ? `${baseStyles} ${panelStyles}` : simpleStyles;

    return (
        <div className={`${selectedStyle} ${className}`} {...props}>
            {children}
        </div>
    );
}
