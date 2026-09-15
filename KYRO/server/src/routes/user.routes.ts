import { Router } from 'express'
import * as controller from '../controllers/userController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { changePinSchema, updateProfileSchema } from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

router.get('/me', asyncHandler(controller.getProfile))
router.put('/me', validate(updateProfileSchema), asyncHandler(controller.updateProfile))
router.put('/me/pin', validate(changePinSchema), asyncHandler(controller.changePin))
router.get('/directory', asyncHandler(controller.getDirectory))
router.get('/lookup', asyncHandler(controller.lookupUpi))

export default router
