import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
    return (
        <label className="flex flex-col gap-2 text-sm text-white/70">
            {label && <span>{label}</span>}
            <input
                className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-glow/70 ${className}`}
                {...props}
            />
        </label>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
    return (
        <label className="flex flex-col gap-2 text-sm text-white/70">
            {label && <span>{label}</span>}
            <select
                className={`w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-glow/70 ${className}`}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="text-ink">
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
