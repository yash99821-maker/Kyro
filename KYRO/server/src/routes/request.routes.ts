import { Router } from 'express'
import * as controller from '../controllers/requestController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { moneyRequestSchema, updateRequestStatusSchema } from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

router.post('/', validate(moneyRequestSchema), asyncHandler(controller.createRequest))
router.get('/', asyncHandler(controller.listRequests))
router.put(
  '/:id/status',
  validate(updateRequestStatusSchema),
  asyncHandler(controller.updateRequestStatus),
)
router.delete('/:id', asyncHandler(controller.cancelRequest))

export default router
