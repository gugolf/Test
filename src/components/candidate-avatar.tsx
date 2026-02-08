"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CandidateAvatarProps {
    src?: string | null;
    name?: string;
    className?: string;
    fallbackClassName?: string;
}

export function CandidateAvatar({ src, name, className, fallbackClassName }: CandidateAvatarProps) {
    const defaultAvatar = "https://ddeqeaicjyrevqdognbn.supabase.co/storage/v1/object/public/system/Blank%20Profile.JPG";
    const [imgSrc, setImgSrc] = useState<string>(src || defaultAvatar);

    useEffect(() => {
        setImgSrc(src || defaultAvatar);
    }, [src]);

    return (
        <Avatar className={cn("overflow-hidden", className)}>
            <AvatarImage
                src={imgSrc}
                className="object-cover"
                onError={() => setImgSrc(defaultAvatar)}
            />
            <AvatarFallback className={cn("bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black", fallbackClassName)}>
                {name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
}
