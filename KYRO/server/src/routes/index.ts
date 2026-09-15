import { Router } from 'express'
import authRoutes from './auth.routes.js'
import userRoutes from './user.routes.js'
import paymentRoutes from './payment.routes.js'
import transactionRoutes from './transaction.routes.js'
import savingsRoutes from './savings.routes.js'
import groupRoutes from './group.routes.js'
import insightsRoutes from './insights.routes.js'
import notificationRoutes from './notification.routes.js'
import requestRoutes from './request.routes.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ success: true, service: 'KYRO API', status: 'ok', time: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/payments', paymentRoutes)
router.use('/transactions', transactionRoutes)
router.use('/savings', savingsRoutes)
router.use('/groups', groupRoutes)
router.use('/insights', insightsRoutes)
router.use('/notifications', notificationRoutes)
router.use('/requests', requestRoutes)

export default router
