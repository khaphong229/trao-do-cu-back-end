import {User} from '@/models'
import {FileUpload} from '@/utils/classes'
import {LINK_STATIC_URL} from '@/configs'
import { abort } from '@/utils/helpers'

export async function create(requestBody) {
    const user = new User(requestBody)
    await user.save()
    return user
}

export async function filter({q, page, per_page, field, sort_order}) {
    q = q ? {$regex: q, $options: 'i'} : null

    const filter = {
        ...(q && {$or: [{name: q}, {email: q}, {phone: q}]}),
    }

    const users = await User.find(filter)
        .skip((page - 1) * per_page)
        .limit(per_page)
        .sort({[field]: sort_order})

    users.forEach(function (user) {
        user.avatar = user.avatar && LINK_STATIC_URL + user.avatar
    })

    const total = await User.countDocuments(filter)
    return {total, page, per_page, users}
}

export async function details(userId) {
    const user = await User.findById(userId)
    user.avatar = user.avatar && LINK_STATIC_URL + user.avatar
    return user
}

export async function update(user, {name, email, phone}) {
    user.name = name
    user.email = email
    user.phone = phone
    await user.save()
}

export async function resetPassword(user, newPassword) {
    await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { password: newPassword } },
        { new: true, runValidators: true }
    )
}

export async function remove(user) {
    if (user.avatar) {
        FileUpload.remove(user.avatar)
    }
    await User.deleteOne({_id: user._id})
}

export const deleteInvalidUsers = async () => {
    try {
        // Đầu tiên, đếm số lượng người dùng phù hợp với tiêu chí xóa
        const matchingCount = await User.countDocuments({
            $or: [
                { phone: null },
                { phone: '' },
                { isSurveyed: false }
            ]
        })
        
        console.log(`Tìm thấy ${matchingCount} người dùng phù hợp với tiêu chí xóa`)
        
        // Nếu có người dùng phù hợp, tiến hành xóa
        if (matchingCount > 0) {
            // Thiết lập thời gian chờ cao hơn cho thao tác này
            const timeoutMS = 120000 // 2 phút
            
            // Sử dụng cách tiếp cận có mục tiêu hơn - xóa theo từng đợt nhỏ
            // Bắt đầu với người dùng có số điện thoại null
            const result1 = await User.deleteMany(
                { phone: null },
                { maxTimeMS: timeoutMS }
            )
            
            // Sau đó là người dùng có chuỗi số điện thoại rỗng
            const result2 = await User.deleteMany(
                { phone: '' },
                { maxTimeMS: timeoutMS }
            )
            
            // Sau đó là người dùng chưa hoàn thành khảo sát
            const result3 = await User.deleteMany(
                { isSurveyed: false },
                { maxTimeMS: timeoutMS }
            )
            
            const totalDeleted = (result1.deletedCount || 0) + 
                               (result2.deletedCount || 0) + 
                               (result3.deletedCount || 0)
            
            return {
                message: `Đã xóa thành công ${totalDeleted} tài khoản không hợp lệ`,
                deletedCount: totalDeleted,
                details: {
                    nullPhone: result1.deletedCount || 0,
                    emptyPhone: result2.deletedCount || 0,
                    notSurveyed: result3.deletedCount || 0
                }
            }
        } else {
            return {
                message: 'Không tìm thấy tài khoản không hợp lệ để xóa',
                deletedCount: 0
            }
        }
    } catch (error) {
        console.error('Chi tiết lỗi:', error)
        
        // Thông báo lỗi cụ thể hơn cho trường hợp timeout
        if (error.name === 'MongoNetworkTimeoutError') {
            abort(500, 'Thao tác xóa bị timeout. Vui lòng thử lại với ít bản ghi hơn hoặc tăng thời gian timeout.')
        } else {
            abort(500, 'Có lỗi khi xóa user: ' + error.message)
        }
    }
}