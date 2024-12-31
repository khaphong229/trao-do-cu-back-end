import requireAuthentication from '@/app/middleware/common/admin/require-authentication'
import validate from '@/app/middleware/common/validate'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import * as categoryRequest from '../../app/requests/admin/categoryAdmin.request'
import * as categoryController from '../../app/controllers/admin/categoryAdmin.controller'
const categoryRouter = Router()

categoryRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(categoryRequest.getAllCategory)),
    asyncHandler(categoryController.create)
)

categoryRouter.get('/', asyncHandler(categoryController.readRoot))

categoryRouter.get('/filter', asyncHandler(categoryController.readPost))

export default categoryRouter
