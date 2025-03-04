import { User } from '@/models'
import { abort } from '@/utils/helpers'

export async function checkSurveyStatus(userId) {
    const user = await User.findById(userId)
    if (!user) {
        abort(404, 'User not found')
    }

    return {
        isSurveyed: user.isSurveyed
    }
}

export async function updateSurveyStatus(userId) {
    const user = await User.findByIdAndUpdate(
        userId,
        { isSurveyed: true },
        { new: true }
    )

    if (!user) {
        abort(404, 'User not found')
    }

    return {
        isSurveyed: user.isSurveyed
    }
} 