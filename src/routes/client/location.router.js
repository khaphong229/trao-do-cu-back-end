import * as locationController from '../../app/controllers/client/location.controller'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const locationsRouter = Router()

// [GET] : /posts?
locationsRouter.get('/', asyncHandler(locationController.readRoot))

export default locationsRouter
