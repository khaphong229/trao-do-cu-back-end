import requireAuthentication from '@/app/middleware/common/client/require-authentication'
import * as surveyController from '../../app/controllers/client/survey.controller'
import {asyncHandler} from '@/utils/helpers'
import {Router} from 'express'

const surveyRouter = Router()

// [GET] : /surveys/status
surveyRouter.get(
    '/status',
    asyncHandler(requireAuthentication),
    asyncHandler(surveyController.checkSurveyStatus)
)

// [PUT] : /surveys/update-status
surveyRouter.put(
    '/update-status',
    asyncHandler(requireAuthentication),
    asyncHandler(surveyController.updateSurveyStatus)
)

export default surveyRouter