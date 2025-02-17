import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import * as postRequest from '../../app/requests/client/post.request'
import * as postController from '../../app/controllers/client/post.controller'
import * as clubMiddleware from '../../app/middleware/common/client/post.middleware'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'
import validate from '@/app/middleware/common/validate'

const postRouter = Router()

// [GET] : /posts?
postRouter.get('/', asyncHandler(postController.readRoot))

// [GET] : /posts/me
postRouter.get('/me', asyncHandler(requireAuthentication), asyncHandler(postController.readRootMe))

// [GET] : /posts/id
postRouter.get('/:id', asyncHandler(clubMiddleware.checkId), asyncHandler(postController.detailPost))

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
