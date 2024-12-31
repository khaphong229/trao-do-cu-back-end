import authRouter from './auth.router'
import categoryRouter from './category.router'
import postRouter from './post.router'
import locationsRouter from './location.router'
import requestGiftRouter from './requests_receive.router'
import requestExchangeRouter from './requests_exchange.router'

function routeClient(app) {
    app.use('/auth', authRouter)

    app.use('/category', categoryRouter)

    app.use('/posts', postRouter)

    app.use('/locations', locationsRouter)

    app.use('/request_gift', requestGiftRouter)

    app.use('/request_exchange', requestExchangeRouter)
}

export default routeClient
