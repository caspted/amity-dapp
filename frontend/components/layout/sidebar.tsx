"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderPlus,
  Briefcase,
  Wallet,
  ChevronRight,
} from "lucide-react";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "Create Project", icon: FolderPlus },
  { href: "/dashboard?role=client", label: "My Projects", icon: Briefcase },
];

const providerLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard?role=provider", label: "My Contracts", icon: Briefcase },
];

interface SidebarProps {
  role: "client" | "provider" | "none";
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {active && <ChevronRight className="ml-auto h-3 w-3" />}
    </Link>
  );
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { address } = useAccount();
  const links = role === "provider" ? providerLinks : clientLinks;

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-border bg-card px-3 py-4">
      <nav className="flex-1 space-y-1">
        {links.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href.split("?")[0]}
          />
        ))}
      </nav>

      {address && (
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Connected as</p>
              <p className="text-xs font-mono font-medium truncate">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
