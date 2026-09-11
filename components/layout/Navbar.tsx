'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Layers,
  ShieldCheck,
  BarChart3,
  Bell,
  Menu,
  X,
  Compass,
  Bot,
} from 'lucide-react'

interface NavLinkItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  active: boolean
  disabled?: boolean
  badge?: string
}

export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks: NavLinkItem[] = [
    { href: '/', label: 'Home', icon: Compass, active: pathname === '/' },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/dashboard/projects',
      label: 'Projects',
      icon: Layers,
      active: pathname.startsWith('/dashboard/projects'),
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/analytics'),
    },
    {
      href: '/dashboard/alerts',
      label: 'Alerts',
      icon: Bell,
      active: pathname.startsWith('/dashboard/alerts'),
    },
    {
      href: '/dashboard/assistant',
      label: 'AI Assistant',
      icon: Bot,
      active: pathname.startsWith('/dashboard/assistant'),
    },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      {/* Top institutional strip */}
      <div className="bg-slate-900 text-slate-300 text-[11px] font-medium tracking-wide py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>SMART INDIA HACKATHON 2026 &bull; INFRASTRUCTURE MONITORING PROTOTYPE</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-400">
            <span>PAIMANA / OCMS Standards Alignment</span>
            <span>&bull;</span>
            <span className="text-slate-300 font-mono">Dual-Target ML v1.0</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-10 shrink-0 flex items-center justify-center">
                <Image
                  src="/images/emblem.png"
                  alt="State Emblem of India"
                  width={32}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="border-l border-slate-200 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">
                    PRAGATI
                  </span>
                  <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 tracking-wider">
                    SIH 2026
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal leading-tight hidden sm:block">
                  Predictive Infrastructure Monitoring &amp; Analytics
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {navLinks.map((item) => {
              const Icon = item.icon
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 cursor-not-allowed select-none"
                  >
                    <Icon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/70 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      item.active ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right Action / Status pill */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dual-Target ML Ready</span>
            </div>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-md">
          {navLinks.map((item) => {
            const Icon = item.icon
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2 text-sm text-slate-400"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-300" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      {item.badge}
                    </span>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
