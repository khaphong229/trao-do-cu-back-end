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
// [GET] : /request_exchange/me
exchangeRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(exchangeController.readListMe))

// [GET] : /request_exchange?
exchangeRouter.get('/', asyncHandler(requireAuthentication), asyncHandler(exchangeController.readList))

// [PATCH] : /request_exchange/me
exchangeRouter.patch('/', asyncHandler(requireAuthentication), asyncHandler(exchangeController.success))

// [DELETE] : /request_gift/:id
exchangeRouter.delete(
    '/:id',
    asyncHandler(excMiddleware.checkId),
    asyncHandler(requireAuthentication),
    asyncHandler(exchangeController.deleted)
)
export default exchangeRouter
