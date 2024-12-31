import {isValidObjectId} from 'mongoose'
import {abort} from '@/utils/helpers'
import RequestsReceive from '@/models/client/requests_receive'

export async function checkId(req, res, next) {
    if (isValidObjectId(req.params.id)) {
        const user = await RequestsReceive.findOne({_id: req.params.id})
        if (user) {
            req.user = user
            next()
            return
        }
    }
    abort(404, 'Không tồn tại vật phẩm này.')
}
