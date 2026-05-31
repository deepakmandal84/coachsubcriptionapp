import ProgressTracker from '../ProgressTracker'
import { useParentPortal } from '../../context/ParentPortalContext'

export default function ParentPortalProgress() {
  const { token, data } = useParentPortal()
  return (
    <ProgressTracker mode="parent" token={token} studentName={data.studentName} embedded />
  )
}
