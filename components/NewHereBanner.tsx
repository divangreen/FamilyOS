'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Baby, GraduationCap, Moon, Heart, Users } from 'lucide-react'

interface QuickLink {
  label:  string
  href:   string
  icon:   React.ReactNode
}

interface NewHereBannerProps {
  subVillageIds: Record<string, string>
}

export function NewHereBanner({ subVillageIds }: NewHereBannerProps) {
  const router   = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('village_new_here_dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem('village_new_here_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  const quickLinks: QuickLink[] = [
    {
      label: 'New baby (0–3 months)',
      href:  subVillageIds['Newborns (0–3 months)'] ? `/feed?subVillage=${subVillageIds['Newborns (0–3 months)']}` : '/feed?q=newborn',
      icon:  <Baby className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      label: 'Pregnancy',
      href:  subVillageIds['Pregnancy'] ? `/feed?subVillage=${subVillageIds['Pregnancy']}` : '/feed?q=pregnancy',
      icon:  <Heart className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      label: 'Sleep training',
      href:  '/feed?q=sleep+training',
      icon:  <Moon className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      label: 'School & Education',
      href:  subVillageIds['Education'] ? `/feed?subVillage=${subVillageIds['Education']}` : '/feed?q=school',
      icon:  <GraduationCap className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      label: 'Mental Health',
      href:  subVillageIds['Mental Health'] ? `/feed?subVillage=${subVillageIds['Mental Health']}` : '/feed?q=mental+health',
      icon:  <Users className="h-3.5 w-3.5 shrink-0" />,
    },
  ]

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4 relative">

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 ui-sans mb-1 pr-6">
        New to The Village?
      </p>
      <p className="text-xs text-amber-700 dark:text-amber-400 ui-sans mb-3">
        Start with a topic that matters to you right now.
      </p>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <button
            key={link.label}
            onClick={() => router.push(link.href)}
            className="flex items-center gap-1.5 text-xs bg-white dark:bg-amber-900 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors ui-sans"
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </div>

    </div>
  )
}
