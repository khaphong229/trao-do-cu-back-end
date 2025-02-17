// eslint-disable-next-line import/no-unresolved
import * as locationService from '../../services/client/location.service'

export async function readRoot(req, res) {
    const data = await locationService.read()
    res.jsonify(data)
}

export async function cityVN(req, res) {
    const data = await locationService.getCity()
    res.jsonify(data)
}
