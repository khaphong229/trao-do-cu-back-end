import * as locationController from '../../app/controllers/client/location.controller'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const locationsRouter = Router()

// [GET] : /posts?
locationsRouter.get('/vietnameses-provinces', asyncHandler(locationController.readRoot))

locationsRouter.get('/vietnamese-city', asyncHandler(locationController.cityVN))

export default locationsRouter
