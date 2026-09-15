import { Router } from 'express'
import * as controller from '../controllers/transactionController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { transactionQuerySchema } from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

// "/summary" is registered before "/:id" so it is not parsed as an id.
router.get('/summary', asyncHandler(controller.getSummary))
router.get('/', validate(transactionQuerySchema, 'query'), asyncHandler(controller.listTransactions))
router.get('/:id', asyncHandler(controller.getTransaction))

export default router
