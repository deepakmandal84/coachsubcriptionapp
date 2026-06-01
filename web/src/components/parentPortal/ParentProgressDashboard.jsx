import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parentApi } from '../../api'
import { useParentPortal } from '../../context/ParentPortalContext'
import { useParentProgress } from '../../context/ParentProgressContext'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Input from '../ui/Input'
import { formatWeight, isImperial } from '../../utils/progressUnits'
import { useToast } from '../../context/ToastContext'
import { formatError } from '../../utils/formatError'

function SideStat({ label, value, hint }) {
  return (
    <div className="text-center min-w-0 px-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 tabular-nums mt-1">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{hint}</p>}
    </div>
  )
}

function MetricTile({ label, value, delta, deltaLabel, accent }) {
  return (
    <div
      className="rounded-xl border px-3 py-3 text-center"
      style={{
        backgroundColor: `${accent}0c`,
        borderColor: `${accent}22`,
      }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{value}</p>
      {delta != null && delta !== '' && (
        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{deltaLabel ?? delta}</p>
      )}
    </div>
  )
}

function ProgressBar({ label, percent, accent }) {
  const p = percent == null ? 0 : Math.min(100, Math.max(0, percent))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-slate-800">{p.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${p}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  )
}

export default function ParentProgressDashboard({ onLogCheckIn }) {
  const { primary } = useParentPortal()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const { token, summary, profile, unit, stats, loading, err, setErr, reload, openCheckIn } = useParentProgress()

  const [profileForm, setProfileForm] = useState({ gender: 'Unspecified', height: '', dateOfBirth: '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    setProfileForm({
      gender: profile.gender || 'Unspecified',
      height: profile.height != null ? String(profile.height) : '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    })
  }, [profile])

  useEffect(() => {
    if (searchParams.get('action') === 'checkin') openCheckIn()
  }, [searchParams, openCheckIn])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileBusy(true)
    try {
      await parentApi.updateProfile(token, {
        gender: profileForm.gender,
        height: profileForm.height === '' ? null : Number(profileForm.height),
        dateOfBirth: profileForm.dateOfBirth || null,
      })
      toast.success('Profile updated')
      reload()
      setProfileOpen(false)
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setProfileBusy(false)
    }
  }

  const weightUnit = isImperial(unit) ? 'lb' : 'kg'
  const ringPercent = stats.progressPercent ?? 0
  const ringCircumference = 264
  const logCheckIn = onLogCheckIn ?? openCheckIn

  if (loading && !summary) {
    return <p className="text-slate-500 text-center py-10 animate-pulse text-sm">Loading your progress…</p>
  }

  const weightLostDisplay =
    stats.weightLost != null && stats.weightLost > 0
      ? formatWeight(stats.weightLost, unit)
      : stats.weightLost != null && stats.weightLost < 0
        ? `+${formatWeight(Math.abs(stats.weightLost), unit)}`
        : '—'

  const bfDelta =
    stats.bodyFatLost != null && stats.bodyFatLost > 0
      ? `−${stats.bodyFatLost} pts`
      : null

  return (
    <div className="space-y-4">
      {err && (
        <Alert variant="error" onDismiss={() => setErr('')}>
          {err}
        </Alert>
      )}

      <section className="relative rounded-2xl bg-white border border-slate-200/90 shadow-md overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${primary}18 0%, ${primary}06 45%, transparent 100%)`,
          }}
          aria-hidden
        />

        <div className="relative px-4 pt-5 pb-4 border-b border-slate-100/80">
          <div className="grid grid-cols-3 gap-1 items-center">
            <SideStat
              label="Starting"
              value={stats.startWeight != null ? formatWeight(stats.startWeight, unit) : '—'}
              hint={stats.startBmi != null ? `BMI ${stats.startBmi.toFixed(1)}` : stats.startLabel}
            />

            <div className="flex flex-col items-center">
              <div className="relative h-[5.75rem] w-[5.75rem]">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-100" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    stroke={primary}
                    strokeDasharray={`${(ringPercent / 100) * ringCircumference} ${ringCircumference}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                    {stats.currentWeight != null ? Number(stats.currentWeight).toFixed(1) : '—'}
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5" style={{ color: primary }}>
                    {weightUnit}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">{stats.currentLabel || 'Latest'}</p>
            </div>

            <SideStat
              label="Body fat"
              value={stats.currentBodyFat != null ? `${stats.currentBodyFat}%` : '—'}
              hint={stats.startBodyFat != null ? `Started ${stats.startBodyFat}%` : null}
            />
          </div>
        </div>

        <div className="relative px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <MetricTile
              label="Body fat"
              value={stats.currentBodyFat != null ? `${stats.currentBodyFat}%` : '—'}
              delta={bfDelta}
              accent={primary}
            />
            <MetricTile
              label="Change"
              value={weightLostDisplay}
              delta={stats.weightLostPct != null && stats.weightLost > 0 ? `${stats.weightLostPct}% of start` : null}
              accent="#d97706"
            />
            <MetricTile label="Check-ins" value={String(stats.checkInCount)} accent="#6366f1" />
          </div>

          <div className="space-y-3 rounded-xl bg-slate-50/80 border border-slate-100 px-3 py-3">
            <ProgressBar label="Toward your goal" percent={stats.progressPercent} accent={primary} />
            <ProgressBar label="Time on program" percent={stats.timePercent} accent="#64748b" />
          </div>

          {stats.currentBmi != null && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-1">
              <span className="text-sm text-slate-600">
                BMI <span className="font-semibold text-slate-900 tabular-nums">{stats.currentBmi.toFixed(1)}</span>
              </span>
              {stats.bmiInfo && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${stats.bmiInfo.badge}`}>
                  {stats.bmiInfo.label}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={logCheckIn}
            className="w-full py-3.5 rounded-xl btn-brand text-white font-semibold shadow-sm hover:opacity-95 transition"
          >
            Log weight & measurements
          </button>
        </div>

        {stats.hasData && (
          <p className="relative text-xs text-slate-500 text-center px-4 pb-4 -mt-1">
            Journey started {stats.startLabel}
            {stats.startWeight != null && ` · ${formatWeight(stats.startWeight, unit)}`}
          </p>
        )}
      </section>

      {!stats.hasData && (
        <p className="text-sm text-slate-600 text-center leading-relaxed px-2">
          Tap <strong className="font-medium text-slate-800">Log weight & measurements</strong> for your first entry.
          See charts under <strong className="font-medium text-slate-800">Trends</strong>, history under{' '}
          <strong className="font-medium text-slate-800">Check-ins</strong>.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-slate-800 hover:bg-slate-50/80 transition"
          onClick={() => setProfileOpen((o) => !o)}
        >
          <span>Body profile</span>
          <span className="text-slate-400 text-xs">{profileOpen ? 'Hide' : 'Edit'}</span>
        </button>
        {profileOpen && (
          <form onSubmit={handleSaveProfile} className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 -mt-1 mb-2">Used to estimate body fat when you log measurements.</p>
            <Select
              label="Gender"
              value={profileForm.gender}
              onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
            >
              <option value="Unspecified">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input
              label={isImperial(unit) ? 'Height (in)' : 'Height (cm)'}
              type="number"
              step="0.1"
              min="0"
              value={profileForm.height}
              onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))}
            />
            <Input
              label="Date of birth"
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(e) => setProfileForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
            />
            <Button type="submit" size="sm" disabled={profileBusy} className="w-full">
              {profileBusy ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
