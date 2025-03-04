import authRouter from './auth.router'
import categoryRouter from './category.router'
import postRouter from './post.router'
import locationsRouter from './location.router'
import requestGiftRouter from './requests_gift.router'
import requestExchangeRouter from './requests_exchange.router'
import notificationRouter from './notification.router'
import userInterestRouter from './user_interest.router'
import userInteractionRouter from './user_interaction.router'
import surveyRouter from './survey.router'

function routeClient(app) {
    app.use('/auth', authRouter)

    app.use('/category', categoryRouter)

    app.use('/posts', postRouter)

    app.use('/locations', locationsRouter)

    app.use('/request_gift', requestGiftRouter)

    app.use('/request_exchange', requestExchangeRouter)

    app.use('/notifications', notificationRouter)

    app.use('/user-interests', userInterestRouter)

    app.use('/user-interactions', userInteractionRouter)

    app.use('/surveys', surveyRouter)
}

export default routeClient
