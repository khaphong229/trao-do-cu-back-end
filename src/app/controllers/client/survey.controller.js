import * as surveyService from '../../services/client/survey.service'

export async function checkSurveyStatus(req, res) {
    const userId = req.currentUser._id
    const result = await surveyService.checkSurveyStatus(userId)
    res.json({
        status: 'success',
        data: result
    })
}

export async function updateSurveyStatus(req, res) {
    const userId = req.currentUser._id
    const result = await surveyService.updateSurveyStatus(userId)
    res.json({
        status: 'success',
        data: result
    })
} 