import UserInterest from '@/models/client/user_interest'
import {abort} from '@/utils/helpers'

export async function updateUserInterests(userId, interests) {
    // Tìm document interests hiện tại của user
    let userInterest = await UserInterest.findOne({ user_id: userId })

    if (!userInterest) {
        // Nếu chưa có, tạo mới
        userInterest = new UserInterest({
            user_id: userId,
            interests: interests.map(interest => ({
                ...interest,
                selected_at: new Date()
            }))
        })
    } else {
        // Nếu đã có, cập nhật interests mới
        userInterest.interests = interests.map(interest => ({
            ...interest,
            selected_at: new Date()
        }))
        userInterest.updated_at = new Date()
    }

    // Lưu thay đổi
    await userInterest.save()
    return userInterest
}

export async function getUserInterests(userId) {
    const userInterest = await UserInterest.findOne({ user_id: userId })
        .populate('interests.category_id', 'name description logo')
    return userInterest?.interests || []
} 