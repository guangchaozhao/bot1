export const createStorageApi = ({
  namespace,
  sidebarWidthDefault,
  sidebarWidthMin,
  sidebarWidthMax,
}) => {
  const keys = {
    sessions: `${namespace}_chat_sessions_v1`,
    userId: `${namespace}_user_id_v1`,
    ui: `${namespace}_ui_state_v1`,
  }

  const clampSidebarWidth = (value) => (
    Number.isFinite(value)
      ? Math.max(sidebarWidthMin, Math.min(sidebarWidthMax, value))
      : sidebarWidthDefault
  )

  const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    createId,
    getUserId() {
      const existing = window.localStorage.getItem(keys.userId)
      if (existing) return existing
      const next = `local-${createId()}`
      window.localStorage.setItem(keys.userId, next)
      return next
    },
    loadSessions() {
      const raw = window.localStorage.getItem(keys.sessions)
      if (!raw) return []

      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    saveSessions(sessions) {
      window.localStorage.setItem(keys.sessions, JSON.stringify(sessions))
    },
    loadUiState() {
      const raw = window.localStorage.getItem(keys.ui)
      if (!raw) {
        return {
          sidebarCollapsed: false,
          sidebarWidth: sidebarWidthDefault,
        }
      }

      try {
        const parsed = JSON.parse(raw)
        return {
          sidebarCollapsed: Boolean(parsed?.sidebarCollapsed),
          sidebarWidth: clampSidebarWidth(parsed?.sidebarWidth),
        }
      } catch {
        return {
          sidebarCollapsed: false,
          sidebarWidth: sidebarWidthDefault,
        }
      }
    },
    saveUiState(uiState) {
      window.localStorage.setItem(keys.ui, JSON.stringify({
        sidebarCollapsed: Boolean(uiState?.sidebarCollapsed),
        sidebarWidth: clampSidebarWidth(uiState?.sidebarWidth),
      }))
    },
  }
}
