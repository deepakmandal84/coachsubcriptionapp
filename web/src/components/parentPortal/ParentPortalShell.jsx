import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_PARENT_PORTAL_TAB,
  getParentPortalFeature,
  getVisibleParentPortalFeatures,
} from '../../config/parentPortalFeatures'
import { useParentPortal } from '../../context/ParentPortalContext'

function PortalTabButton({ feature, active, primary, onSelect, layout }) {
  const Icon = feature.icon
  const isActive = active === feature.id

  if (layout === 'bottom') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => onSelect(feature.id)}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition ${
          isActive ? 'text-slate-900' : 'text-slate-500'
        }`}
        style={isActive ? { color: primary } : undefined}
      >
        <Icon className={`text-xl ${isActive ? '' : 'opacity-70'}`} aria-hidden />
        <span>{feature.shortLabel || feature.label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(feature.id)}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition ${
        isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
      }`}
      style={isActive ? { backgroundColor: primary } : undefined}
    >
      <Icon className="text-base" aria-hidden />
      {feature.label}
    </button>
  )
}

export default function ParentPortalShell() {
  const { data, primary } = useParentPortal()
  const [searchParams, setSearchParams] = useSearchParams()

  const features = useMemo(() => getVisibleParentPortalFeatures({ data }), [data])
  const tabParam = searchParams.get('tab')
  const activeId = getParentPortalFeature(tabParam)?.id ? tabParam : DEFAULT_PARENT_PORTAL_TAB
  const activeFeature = getParentPortalFeature(activeId) || features[0]
  const ActivePanel = activeFeature?.component

  function setTab(id) {
    setSearchParams(id === DEFAULT_PARENT_PORTAL_TAB ? {} : { tab: id }, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/80 flex flex-col">
      <header
        className="sticky top-0 z-20 border-b border-white/20 shadow-sm backdrop-blur-md"
        style={{ backgroundColor: `${primary}12` }}
      >
        <div className="mx-auto w-full max-w-lg px-4 pt-5 pb-4">
          <div className="flex items-start gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="h-11 w-auto object-contain shrink-0" />
            ) : (
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-lg font-bold"
                style={{ backgroundColor: primary }}
              >
                {data.academyName?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-slate-900 truncate">{data.academyName}</h1>
              <p className="text-sm text-slate-600 truncate">
                {data.studentName}
                <span className="text-slate-400"> · Client portal</span>
              </p>
            </div>
          </div>

          <nav
            className="hidden md:flex mt-4 gap-1 overflow-x-auto pb-0.5 -mx-1 px-1"
            role="tablist"
            aria-label="Portal sections"
          >
            {features.map((f) => (
              <PortalTabButton
                key={f.id}
                feature={f}
                active={activeId}
                primary={primary}
                onSelect={setTab}
                layout="top"
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-5 pb-24 md:pb-8">
        {ActivePanel ? <ActivePanel /> : null}
      </main>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-md safe-area-pb"
        role="tablist"
        aria-label="Portal sections"
      >
        <div className="flex max-w-lg mx-auto">
          {features.map((f) => (
            <PortalTabButton
              key={f.id}
              feature={f}
              active={activeId}
              primary={primary}
              onSelect={setTab}
              layout="bottom"
            />
          ))}
        </div>
      </nav>

      <footer className="hidden md:block pb-6 text-center">
        <p className="text-xs text-slate-400">Private link for {data.studentName} only</p>
      </footer>
    </div>
  )
}
