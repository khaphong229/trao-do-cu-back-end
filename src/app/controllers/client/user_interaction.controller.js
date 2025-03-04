import * as userInteractionService from '../../services/client/user_interaction.service'

export async function saveBatchInteractions(req, res) {
    const userId = req.currentUser._id
    const { interactions } = req.body
    
    const result = await userInteractionService.saveBatchInteractions(
        userId,
        interactions
    )
    
    res.jsonify({
        message: 'Lưu tương tác thành công',
        data: result
    })
}

export async function getTopCategories(req, res) {
    const userId = req.currentUser._id
    const days = parseInt(req.query.days) || 1
    
    const categories = await userInteractionService.getTopCategoriesForUser(
        userId,
        days
    )
    
    res.jsonify({
        data: categories
    })
}