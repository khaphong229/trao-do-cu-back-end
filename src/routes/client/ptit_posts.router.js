import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import validate from '@/app/middleware/common/validate'
// import * as postRequest from '../../app/requests/client/post.request'
import * as postController from '../../app/controllers/client/post.controller'
import * as postMiddleware from '../../app/middleware/common/client/post.middleware'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const ptitRouter = Router()

// [GET] : /ptit-posts => Lấy danh sách bài viết PTIT
ptitRouter.get('/', asyncHandler(postController.readListPtit))

// [GET] : /ptit-posts/:id => Lấy chi tiết bài viết PTIT
ptitRouter.get(
    '/:id',
    asyncHandler(requireAuthentication),
    asyncHandler(postMiddleware.checkId),
    asyncHandler(postController.getPostDetail)
)

export default ptitRouter 