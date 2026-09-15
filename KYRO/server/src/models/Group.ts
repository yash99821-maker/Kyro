import mongoose, { Schema, Types, Document, Model } from 'mongoose'
import { applyJsonTransform } from './jsonTransform.js'

/**
 * A group member. `userId` is set when the member is a registered KYRO user;
 * otherwise the member exists only inside the group (name + optional mobile),
 * which keeps "add a friend who has not signed up" working.
 */
export interface IGroupMember {
  _id: Types.ObjectId
  userId: Types.ObjectId | null
  name: string
  mobileNumber: string
}

export interface IGroup extends Document<Types.ObjectId> {
  name: string
  description: string
  emoji: string
  createdBy: Types.ObjectId
  members: Types.DocumentArray<IGroupMember & Document>
  createdAt: Date
  updatedAt: Date
}

const groupMemberSchema = new Schema<IGroupMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  mobileNumber: { type: String, default: '', trim: true },
})

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    emoji: { type: String, default: '👥' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [groupMemberSchema], default: [] },
  },
  { timestamps: true },
)

applyJsonTransform(groupSchema)

export const Group: Model<IGroup> =
  (mongoose.models.Group as Model<IGroup>) ?? mongoose.model<IGroup>('Group', groupSchema)
