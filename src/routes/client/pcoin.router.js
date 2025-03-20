import express from 'express'
import * as pcoinController from '../../app/controllers/client/pcoin.controller'
import auth from '@/app/middleware/common/client/require-authentication'
import { asyncHandler } from '@/utils/helpers'

const router = express.Router()

// Lấy số dư P-Coin
router.get('/balance', asyncHandler(auth), asyncHandler(pcoinController.getBalance))

// Lấy lịch sử giao dịch
router.get('/transactions', asyncHandler(auth), asyncHandler(pcoinController.getTransactionHistory))

export default router 