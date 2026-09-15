import { Router } from 'express'
import * as controller from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loginSchema, verifyOtpSchema } from '../validators/schemas.js'

const router = Router()

router.post('/login', validate(loginSchema), asyncHandler(controller.requestOtp))
router.post('/verify-otp', validate(verifyOtpSchema), asyncHandler(controller.verifyOtp))
router.post('/logout', requireAuth, asyncHandler(controller.logout))
router.get('/me', requireAuth, asyncHandler(controller.me))

export default router
