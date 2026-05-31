import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { studentsApi } from '../api'
import { useAppPaths } from '../hooks/useAppPaths'
import ProgressTracker from '../components/ProgressTracker'
import Alert from '../components/ui/Alert'
import { formatError } from '../utils/formatError'

export default function StudentProgress() {
  const { studentId } = useParams()
  const paths = useAppPaths()
  const [student, setStudent] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!studentId) return
    studentsApi
      .get(studentId)
      .then(setStudent)
      .catch((e) => setErr(formatError(e)))
  }, [studentId])

  const backTo = paths.students || '/students'

  if (err && !student) return <Alert variant="error">{err}</Alert>

  return (
    <div>
      <ProgressTracker mode="coach" studentId={studentId} studentName={student?.name} />
      <p className="mt-4">
        <Link to={backTo} className="text-sm text-brand hover:underline">
          ← Back to students
        </Link>
      </p>
    </div>
  )
}
