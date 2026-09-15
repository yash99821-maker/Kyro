import type { Schema } from 'mongoose'

/**
 * Gives every model the same JSON shape when it is sent to the client:
 * exposes the `id` virtual, drops Mongoose internals, and removes any
 * field listed in `hidden` (used to keep the PIN hash server-side).
 */
export function applyJsonTransform(schema: Schema, hidden: string[] = []): void {
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
      const plain = ret as unknown as Record<string, unknown>
      delete plain.__v
      for (const key of hidden) delete plain[key]
      return plain
    },
  })
}
