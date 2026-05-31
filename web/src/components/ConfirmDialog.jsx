import Modal from './ui/Modal'
import Button from './ui/Button'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  busy,
  onConfirm,
  onCancel,
}) {
  if (!open) return null
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Modal>
  )
}
