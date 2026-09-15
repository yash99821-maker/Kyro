import { Router } from 'express'
import * as controller from '../controllers/insightsController.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

router.get('/', asyncHandler(controller.getInsights))
router.get('/weekly', asyncHandler(controller.getWeekly))
router.get('/monthly', asyncHandler(controller.getMonthly))
router.get('/categories', asyncHandler(controller.getCategories))

export default router
