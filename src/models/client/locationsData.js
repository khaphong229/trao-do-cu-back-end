import mongoose from 'mongoose'
import createModel from '../base'

const Location = createModel(
    'Location',
    'locations',
    {
        locationData: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
    },
    {}
)

export default Location
