/** Primary label for an academy (tenant). */
export function academyTitle(row) {
  return (row?.academyName || row?.name || 'Unnamed academy').trim()
}

/** Owner coach line under the academy name. */
export function academyOwnerLine(row) {
  const owner = row?.ownerName ?? row?.name
  const email = row?.ownerEmail ?? row?.email
  if (owner && email) return `Owner: ${owner} · ${email}`
  if (email) return email
  return owner || ''
}

/** Dropdown / picker label. */
export function academyPickerLabel(row) {
  const title = academyTitle(row)
  const owner = row?.ownerName ?? row?.name
  if (owner && owner !== title) return `${title} — ${owner}`
  return title
}
