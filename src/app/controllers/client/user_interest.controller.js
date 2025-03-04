import * as userInterestService from '../../services/client/user_interest.service'

export async function updateInterests(req, res) {
    const userId = req.currentUser._id
    const interests = req.body.interests
    
    const result = await userInterestService.updateUserInterests(userId, interests)
    res.jsonify({
        message: 'Cập nhật danh mục quan tâm thành công',
        data: result
    })
}

export async function getInterests(req, res) {
    const userId = req.currentUser._id
    const interests = await userInterestService.getUserInterests(userId)
    res.jsonify({
        data: interests
    })
} 