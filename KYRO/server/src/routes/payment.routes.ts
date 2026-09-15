import { Router } from 'express'
import * as controller from '../controllers/paymentController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  billPaymentSchema,
  rechargeSchema,
  scanPaySchema,
  sendMoneySchema,
} from '../validators/schemas.js'

const router = Router()
router.use(requireAuth)

router.post('/send', validate(sendMoneySchema), asyncHandler(controller.sendMoney))
router.post('/scan', validate(scanPaySchema), asyncHandler(controller.scanPay))
router.post('/recharge', validate(rechargeSchema), asyncHandler(controller.recharge))
router.post('/bill', validate(billPaymentSchema), asyncHandler(controller.payBill))
router.get('/resolve-qr', asyncHandler(controller.resolveQr))

export default router
