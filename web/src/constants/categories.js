// Predefined categories for package/academy type. Must match backend ThemeHelper.
export const PACKAGE_CATEGORIES = [
  'Cricket',
  'Bollyx',
  'Personal Training',
  'Dance',
]

export const CATEGORY_THEME_COLORS = {
  'Cricket': '#16a34a',
  'Bollyx': '#c026d3',
  'Personal Training': '#ea580c',
  'Dance': '#7c3aed',
}

export function getThemeColorForCategory(category) {
  if (!category) return '#2563eb'
  return CATEGORY_THEME_COLORS[category] || '#2563eb'
}
