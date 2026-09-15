import { Router } from 'express'
import * as controller from '../controllers/groupController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  addExpenseSchema,
  addMemberSchema,
  createGroupSchema,
  settleSchema,
} from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

router.post('/', validate(createGroupSchema), asyncHandler(controller.createGroup))
router.get('/', asyncHandler(controller.listGroups))
router.get('/:id', asyncHandler(controller.getGroup))
router.delete('/:id', asyncHandler(controller.deleteGroup))

router.post('/:id/members', validate(addMemberSchema), asyncHandler(controller.addMember))
router.delete('/:id/members/:memberId', asyncHandler(controller.removeMember))

router.post('/:id/expenses', validate(addExpenseSchema), asyncHandler(controller.addExpense))
router.delete('/:id/expenses/:expenseId', asyncHandler(controller.deleteExpense))

router.get('/:id/balances', asyncHandler(controller.getBalances))
router.post('/:id/settle', validate(settleSchema), asyncHandler(controller.settleUp))

export default router
