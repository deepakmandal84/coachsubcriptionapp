import Select from '../ui/Select'
import { isPersonalTrainingType } from '../../utils/privateSessionForm'

export default function PrivateSessionClientField({ form, students, onStudentChange }) {
  if (!isPersonalTrainingType(form.type)) return null

  return (
    <div className="space-y-3">
      <Select
        label="Client *"
        value={form.studentId || ''}
        onChange={(e) => onStudentChange(e.target.value)}
        required
      >
        <option value="">Select client…</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <p className="text-xs text-slate-500 -mt-1">
        Changing the client updates who can see this session and refreshes the title. They are signed up automatically.
      </p>
    </div>
  )
}
