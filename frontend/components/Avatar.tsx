"use client";

interface AvatarProps {
    email: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const SIZE_MAP = {
    sm: { px: 28, cls: "w-7 h-7" },
    md: { px: 40, cls: "w-10 h-10" },
    lg: { px: 64, cls: "w-16 h-16" },
};

export function Avatar({ email, size = "md", className = "" }: AvatarProps) {
    const { px, cls } = SIZE_MAP[size];
    const seed = encodeURIComponent(email);
    const src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&scale=80&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={email}
            width={px}
            height={px}
            className={`rounded-full border border-border object-cover bg-muted ${cls} ${className}`}
        />
    );
}
