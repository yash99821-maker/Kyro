import { Router } from 'express'
import * as controller from '../controllers/notificationController.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', asyncHandler(controller.listNotifications))
router.put('/read-all', asyncHandler(controller.markAllRead))
router.put('/:id/read', asyncHandler(controller.markRead))

export default router
