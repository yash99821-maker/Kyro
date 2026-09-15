import { Router } from 'express'
import * as controller from '../controllers/savingsController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { savingsSettingsSchema } from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

router.get('/', asyncHandler(controller.getSavings))
router.get('/history', asyncHandler(controller.getSavingsHistory))
router.put(
  '/settings',
  validate(savingsSettingsSchema),
  asyncHandler(controller.updateSavingsSettings),
)

export default router
