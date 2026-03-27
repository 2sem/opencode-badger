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

export const TerminalNotifyPlugin = async ({ $, client }) => {
  let idleCount = 0

  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      idleCount++

      // 1. BEL character → terminal tab notification icon + dock bounce
      process.stdout.write("\x07")

      // 2. macOS notification → dock badge
      //    Enable in: System Settings → Notifications → Terminal (or iTerm2)
      //    Turn on "Badge app icon" to get the numeric dock badge.
      const script = `display notification "Task complete (#${idleCount})" with title "OpenCode"`

      try {
        await $`osascript -e ${script}`
      } catch (e) {
        client.app.log("warn", `[terminal-notify] osascript failed: ${e.message}`)
      }
    },
  }
}
