import path from "node:path"

/**
 * terminal-notify plugin
 *
 * When OpenCode finishes a session (goes idle):
 *   1. Sends a terminal bell (BEL) → shows notification dot on the tab
 *      and bounces the terminal's dock icon when it is in the background.
 *   2. Sends a macOS notification via osascript, which increments the
 *      terminal's dock badge counter if "Badge app icon" is enabled in
 *      System Settings → Notifications → Terminal (or iTerm2).
 *
 * No dependencies required.
 */

const toLogMessage = (error) => {
  if (error instanceof Error) return error.message
  return typeof error === "string" ? error : String(error)
}

const firstTrimmedString = (...values) => {
  for (const value of values) {
    if (typeof value !== "string") continue
    const trimmedValue = value.trim()
    if (trimmedValue.length > 0) return trimmedValue
  }

  return undefined
}

const resolveWorkspacePath = (workspace) =>
  firstTrimmedString(workspace?.path, workspace?.directory, workspace?.cwd)

const safeCurrentWorkingDirectory = () => {
  try {
    return firstTrimmedString(process.cwd())
  } catch {
    return undefined
  }
}

const resolveEventProjectPath = (event) =>
  firstTrimmedString(
    event.properties?.directory,
    event.properties?.cwd,
    event.properties?.path?.cwd,
  )

const resolveSessionProjectPath = (session) =>
  firstTrimmedString(session?.directory, session?.info?.directory)

const showNotification = async ({ $, message }) =>
  $`osascript -e 'on run argv' -e 'display notification (item 1 of argv) with title "OpenCode"' -e 'end run' ${message}`

const resolveProjectFolder = async ({ client, event }) => {
  const eventProjectPath = resolveEventProjectPath(event)
  const eventWorkspacePath = resolveWorkspacePath(event.properties?.workspace)
  const eventPath = firstTrimmedString(eventProjectPath, eventWorkspacePath)
  const sessionID = event.properties?.sessionID
  let session

  if (!eventPath && sessionID && client.session?.get) {
    try {
      session = await client.session.get({ sessionID })
    } catch (e) {
      client.app.log("warn", `[terminal-notify] session lookup failed: ${toLogMessage(e)}`)
    }
  }

  const sessionProjectPath = resolveSessionProjectPath(session)

  const sessionWorkspacePath = firstTrimmedString(
    resolveWorkspacePath(session?.workspace),
    resolveWorkspacePath(session?.info?.workspace),
  )

  const projectPath = firstTrimmedString(
    eventProjectPath,
    sessionProjectPath,
    eventWorkspacePath,
    sessionWorkspacePath,
    safeCurrentWorkingDirectory(),
  )

  if (!projectPath) return null

  const folder = path.basename(projectPath)
  return folder || null
}

export const TerminalNotifyPlugin = async ({ $, client }) => {
  let idleCount = 0

  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      idleCount++

      // 1. BEL character → terminal tab notification icon + dock bounce
      process.stdout.write("\x07")

      const folder = await resolveProjectFolder({ client, event })
      const message = folder
        ? `${folder}: Task complete (#${idleCount})`
        : `Task complete (#${idleCount})`

      // 2. macOS notification → dock badge
      //    Enable in: System Settings → Notifications → Terminal (or iTerm2)
      //    Turn on "Badge app icon" to get the numeric dock badge.
      try {
        await showNotification({ $, message })
      } catch (e) {
        client.app.log("warn", `[terminal-notify] osascript failed: ${toLogMessage(e)}`)
      }
    },
  }
}
