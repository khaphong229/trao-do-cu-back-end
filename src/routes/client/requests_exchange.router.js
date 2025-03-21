import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
import * as exchangeRequest from '../../app/requests/client/req_exchange.request'
import * as exchangeController from '../../app/controllers/client/reqExchange.controller'
import * as excMiddleware from '../../app/middleware/common/client/reqExchangeCheckId.middeware'
import * as ptiterMiddleware from '../../app/middleware/common/client/checkPtiterAccess.middleware'
import {asyncHandler} from '@/utils/helpers'
import express, {Router} from 'express'
// import { verifyRecaptcha } from '@/app/middleware/common/recaptcha.middleware'


const exchangeRouter = Router()

// [POST] : /exchanges
exchangeRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(exchangeRequest.createExchangeRequestValidate)),
    // asyncHandler(verifyRecaptcha),
    asyncHandler(ptiterMiddleware.checkPtiterAccess),
    asyncHandler(exchangeController.createPost)
)
// [GET] : /request_exchange/me  => Lấy ra danh sách mình yêu cầu với ng khác
exchangeRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(exchangeController.readListMe))

// [GET] : /request_exchange? => lấy ra danh sách người khác yêu cầu
exchangeRouter.get('/', asyncHandler(requireAuthentication), asyncHandler(exchangeController.readList))

// [PATCH] : /request_exchange/me => phê duyệt người đc trao đổi
exchangeRouter.patch('/', asyncHandler(requireAuthentication), asyncHandler(exchangeController.success))

// [DELETE] : /request_gift/:id
exchangeRouter.delete(
    '/:id',
    asyncHandler(excMiddleware.checkId),
    asyncHandler(requireAuthentication),
    asyncHandler(exchangeController.deleted)
)

// [GET] : /request_exchange/countFavorites
exchangeRouter.get('/countFavorites', asyncHandler(requireAuthentication), asyncHandler(exchangeController.countFavorites))

// [GET] : /request_exchange/all-requests => Lấy tất cả yêu cầu của các bài đăng của người dùng
exchangeRouter.get('/all-requests', asyncHandler(requireAuthentication), asyncHandler(exchangeController.getAllRequests))

// [GET] : /request_exchange/requesters-count/:postId => Lấy số lượt yêu cầu hiển thị
exchangeRouter.get(
    '/requesters-count/:postId', 
    asyncHandler(requireAuthentication), 
    asyncHandler(exchangeController.getRequestersCount)
)

// // [GET] : /request_exchange/others-count/:postId => Lấy số người cùng yêu cầu
// exchangeRouter.get(
//     '/others-count/:postId',
//     asyncHandler(requireAuthentication),
//     asyncHandler(exchangeController.getOthersCount)
// )

export default exchangeRouter
