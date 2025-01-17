const passport = require('./config/passport')
const passportAdmin = require('./config/passport1')

const ensureAuthenticated = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    req.user = { ...user.dataValues }
    if (err) {
      return res.json({ status: 'error', message: 'permission denied' })
    }
    if (user) {
      return next()
    } else {
      return res.json({ status: 'error', message: 'permission rejected' })
    }
  })(req, res, next)
}

const ensureAuthenticatedAdmin = (req, res, next) => {
  passportAdmin.authenticate('jwtAdmin', { session: false }, (err, user) => {
    req.user = { ...user.dataValues }
    if (err)  {
      return res.json({ status: 'error', message: 'permission denied' })
    }
    if (user) {
      return next()
    } else {
      return res.json({ status: 'error', message: 'permission rejected' })
    }
  })(req, res, next)
}

const getUser = (req) => {
  return req.user;
}

const checkId = (req) => {
  const userId = req.user.id
  const requestId = Number(req.params.id)
  return (userId === requestId) ? userId : requestId
}

module.exports = {
  ensureAuthenticated,
  ensureAuthenticatedAdmin,
  getUser,
  checkId
};