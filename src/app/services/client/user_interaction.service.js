import UserInteraction from '@/models/client/user_interaction'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import mongoose from 'mongoose'

export async function saveBatchInteractions(userId, interactions) {
    const today = startOfDay(new Date())
    
    // Tìm document của user trong ngày hôm nay
    let userInteraction = await UserInteraction.findOne({
        user_id: userId,
        date: {
            $gte: today,
            $lt: endOfDay(today)
        }
    })

    if (!userInteraction) {
        // Nếu chưa có, tạo mới
        userInteraction = new UserInteraction({
            user_id: userId,
            interactions: interactions,
            date: today
        })
    } else {
        // Nếu đã có, thêm interactions vào mảng hiện có
        userInteraction.interactions.push(...interactions)
        userInteraction.updated_at = new Date()
    }

    await userInteraction.save()
    return userInteraction
}

export async function getTopCategoriesForUser(userId, days = 1) {
    const startDate = startOfDay(subDays(new Date(), days - 1))
    
    // Log để kiểm tra
    console.log('Getting interactions from:', startDate)
    
    const topCategories = await UserInteraction.aggregate([
        {
            $match: {
                user_id: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate }
            }
        },
        { $unwind: '$interactions' },
        {
            $group: {
                _id: '$interactions.category',
                interactionCount: { $sum: 1 },
                lastInteraction: { $max: '$interactions.time_event' }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: '$category' },
        {
            $project: {
                _id: '$category._id',
                name: '$category.name',
                description: '$category.description',
                interactionCount: 1,
                lastInteraction: 1
            }
        },
        { $sort: { interactionCount: -1, lastInteraction: -1 } },
        { $limit: 10 }
    ])

    // Log kết quả
    console.log('Found top categories:', topCategories.length)
    
    return topCategories
} 