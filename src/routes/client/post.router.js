import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import * as postRequest from '../../app/requests/client/post.request'
import * as postController from '../../app/controllers/client/post.controller'
import * as postMiddleware from '../../app/middleware/common/client/post.middleware'
import {abort, asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import validate from '@/app/middleware/common/validate'

const postRouter = Router()

// [GET] : /posts?
postRouter.get('/', 
    asyncHandler(async (req, res, next) => {
        try {
            await requireAuthentication(req, res, next)
        } catch (error) {
            // Nếu không có token hoặc token invalid, vẫn cho phép request đi tiếp
            next()
        }
    }),
    asyncHandler(postController.readRoot)
)

// [GET] : /posts/category/:category_id?
postRouter.get('/category', asyncHandler(postController.readRootCategory))

// [GET] : /posts/me
postRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(postController.readRootMe))

// // [GET] : /posts/id
// postRouter.get('/:id', asyncHandler(postMiddleware.checkId), asyncHandler(postController.detailPost))

// [GET] : /posts/:slug
postRouter.get('/:slug', asyncHandler(requireAuthentication), asyncHandler(postMiddleware.checkSlug), asyncHandler(postController.getPostBySlug))

// [GET] : /posts/ptit
postRouter.get('/ptit', 
    asyncHandler(async (req, res, next) => {
        try {
            // Thử xác thực người dùng nhưng không bắt buộc
            await requireAuthentication(req, res, next)
            console.log('Authentication optional for /posts/ptit:', req.currentUser)
        } catch (error) {
            // Nếu không có token hoặc token invalid, vẫn cho phép request đi tiếp
            console.log('Authentication optional for /posts/ptit:', error.message)
            next()
        }
    }),
    asyncHandler(postController.readListPtit)
)

// [POST] : /posts
postRouter.post(
    '/',
    asyncHandler(requireAuthentication),
    asyncHandler(validate(postRequest.createPostValidate)),
    asyncHandler(postController.createPost)
)

// [POST] : /posts
postRouter.post(
    '/repost',
    asyncHandler(requireAuthentication),
    // asyncHandler(validate(postRequest.createPostValidate)),
    asyncHandler(postController.createRePost)
)


export default postRouter
