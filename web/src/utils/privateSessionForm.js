export const PERSONAL_TRAINING_PREFIX = 'Personal Training'

export function personalTrainingTitle(studentName) {
  const name = (studentName || '').trim()
  return name ? `${PERSONAL_TRAINING_PREFIX} — ${name}` : PERSONAL_TRAINING_PREFIX
}

export function isPersonalTrainingType(type) {
  return type === 'Private'
}

/** Group classes are open for client self-booking; PT (Private) is coach-assigned only. */
export function isGroupSessionType(type) {
  return !isPersonalTrainingType(type)
}

export function applyClientToPrivateForm(form, studentId, students, { updateTitle = true } = {}) {
  const student = students.find((s) => String(s.id) === String(studentId))
  const next = {
    ...form,
    studentId: studentId ? String(studentId) : '',
  }
  if (updateTitle && student) {
    next.title = personalTrainingTitle(student.name)
  }
  return next
}
