import assert from "node:assert/strict"
import test from "node:test"

import { TerminalNotifyPlugin } from "../.opencode/plugins/terminal-notify.js"

const createHarness = async ({ sessionGet } = {}) => {
  let notificationMessage
  let bellCount = 0

  const $ = async (strings, ...values) => {
    notificationMessage = values.at(-1)
    return { strings, values }
  }

  const client = {
    session: sessionGet ? { get: sessionGet } : undefined,
    app: {
      log() {},
    },
  }

  const plugin = await TerminalNotifyPlugin({ $, client })

  return {
    client,
    get notificationMessage() {
      return notificationMessage
    },
    get bellCount() {
      return bellCount
    },
    async emit(event) {
      const originalWrite = process.stdout.write
      process.stdout.write = () => {
        bellCount += 1
        return true
      }

      try {
        await plugin.event({ event })
      } finally {
        process.stdout.write = originalWrite
      }
    },
  }
}

test("uses event metadata without fetching the session", async () => {
  let sessionCalls = 0
  const harness = await createHarness({
    sessionGet: async () => {
      sessionCalls += 1
      return {
        directory: "/tmp/session-project",
      }
    },
  })

  await harness.emit({
    type: "session.idle",
    properties: {
      sessionID: "session-123",
      directory: "/tmp/event-project",
    },
  })

  assert.equal(sessionCalls, 0)
  assert.equal(harness.notificationMessage, "event-project: Task complete (#1)")
  assert.equal(harness.bellCount, 1)
})

test("falls back gracefully when process.cwd() is unavailable", async () => {
  const originalCwd = process.cwd
  process.cwd = () => {
    throw new Error("cwd is unavailable")
  }

  try {
    const harness = await createHarness()

    await assert.doesNotReject(async () => {
      await harness.emit({
        type: "session.idle",
        properties: {},
      })
    })

    assert.equal(harness.notificationMessage, "Task complete (#1)")
    assert.equal(harness.bellCount, 1)
  } finally {
    process.cwd = originalCwd
  }
})
