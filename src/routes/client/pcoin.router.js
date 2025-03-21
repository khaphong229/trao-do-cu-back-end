import express from 'express'
import * as pcoinController from '../../app/controllers/client/pcoin.controller'
import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import { asyncHandler } from '@/utils/helpers'

const pcoinRouter = express.Router()

// Lấy số dư P-Coin
pcoinRouter.get('/balance', asyncHandler(requireAuthentication), asyncHandler(pcoinController.getBalance))

// Lấy lịch sử giao dịch
pcoinRouter.get('/transactions', asyncHandler(requireAuthentication), asyncHandler(pcoinController.getTransactionHistory))

export default pcoinRouter 