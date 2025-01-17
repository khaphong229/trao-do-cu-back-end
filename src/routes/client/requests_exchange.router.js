import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
import * as exchangeRequest from '../../app/requests/client/req_exchange.request'
import * as exchangeController from '../../app/controllers/client/reqExchange.controller'
import * as excMiddleware from '../../app/middleware/common/client/reqExchangeCheckId.middeware'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const exchangeRouter = Router()

// [POST] : /exchanges
exchangeRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(exchangeRequest.createExchangeRequestValidate)),
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

export default exchangeRouter
