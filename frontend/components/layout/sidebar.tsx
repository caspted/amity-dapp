"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import {
  LayoutDashboard,
  FolderPlus,
  Briefcase,
  HardHat,
  Scale,
  Wallet,
  ChevronRight,
} from "lucide-react";
import type { UserRole } from "@/hooks/use-role";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

function getLinks(role: UserRole, isArbiter: boolean): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects/new", label: "Create Project", icon: FolderPlus },
  ];

  if (role === "client" || role === "both") {
    links.push({ href: "/dashboard?view=client", label: "My Projects", icon: Briefcase });
  }
  if (role === "provider" || role === "both") {
    links.push({ href: "/dashboard?view=provider", label: "My Contracts", icon: HardHat });
  }
  if (isArbiter) {
    links.push({ href: "/dashboard?view=arbiter", label: "Arbiter Panel", icon: Scale });
  }

  return links;
}

interface SidebarProps {
  role: UserRole;
  isArbiter?: boolean;
}

function LinkPendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`link-pending ml-auto${pending ? " is-pending" : ""}`}
    />
  );
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {active
        ? <ChevronRight className="ml-auto h-3 w-3" />
        : <LinkPendingIndicator />
      }
    </Link>
  );
}

function SidebarNav({ role, isArbiter = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const links = getLinks(role, isArbiter);

  function isActive(href: string) {
    const [path, qs] = href.split("?");
    if (pathname !== path) return false;
    if (!qs) {
      return !searchParams.get("view");
    }
    const params = new URLSearchParams(qs);
    for (const [key, val] of params.entries()) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  }

  return (
    <nav className="flex-1 space-y-1">
      {links.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isActive(item.href)}
        />
      ))}
    </nav>
  );
}

export function Sidebar({ role, isArbiter = false }: SidebarProps) {
  const { address } = useAccount();
  const fallbackLinks = getLinks(role, isArbiter);

  return (
    <aside className="flex h-full w-(--sidebar-width) flex-col border-r border-border bg-card px-3 py-4">
      <Suspense
        fallback={
          <nav className="flex-1 space-y-1">
            {fallbackLinks.map((item) => (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        }
      >
        <SidebarNav role={role} isArbiter={isArbiter} />
      </Suspense>

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
