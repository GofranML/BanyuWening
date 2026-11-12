import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

interface ContactEmailLinkProps {
  email?: string;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function ContactEmailLink({
  email = "BanyuWening@example.com",
  className = "",
  showIcon = false,
  label,
}: ContactEmailLinkProps) {
  const [href, setHref] = useState(`mailto:${email}`);
  const [target, setTarget] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Client-side detection after hydration
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 2);

    if (!isMobile) {
      // Desktop: Open Gmail web composer in a new tab
      setHref(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`);
      setTarget("_blank");
    } else {
      // Mobile: Native mailto protocol
      setHref(`mailto:${email}`);
      setTarget(undefined);
    }
  }, [email]);

  return (
    <a
      href={href}
      target={target}
      rel={target ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center gap-1.5 transition-colors ${className}`}
    >
      {showIcon && <Mail className="w-3.5 h-3.5" />}
      <span>{label || email}</span>
    </a>
  );
}
