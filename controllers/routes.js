const express 	= require('express')
const path 		= require('path')
const passport 	= require('passport')

const router = express.Router()

const db = require('../config/db')
const acc = require('../src/account')

const BCRYPT_ROUNDS = 13

router.get('/', function (req, res) {
	res.sendFile('index.html', { root: path.join(__dirname, '../views') })
})

router.get('/loggedin', function (req, res) {
	res.send(req.isAuthenticated() ? req.user : '0')
})

router.post('/login', function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		if (err) { return next(err) }
		if (!user) {
			return res.send('invalid')
		}
		if (user.verified === 0){
			return res.send('unverified')
		}
		req.logIn(user, function (err) {
			if (err) { return next(err) }
			return res.send(req.user)
		})
	})(req, res, next)
})

router.post('/doctor-register', function (req, res) {
	var user = {
		email	: req.body.email,
		type 	: 0,
		pass 	: req.body.pass,
		first 	: req.body.first,
		last 	: req.body.last
	}
	acc.register(user).then(function (val){
		val ? res.send('1') : res.send('0')
	})
})

router.post('/patient-register', function (req, res) {
	var user = {
		email	: req.body.email,
		type 	: 1,
		pass 	: req.body.pass,
		first 	: req.body.first,
		last 	: req.body.last
	}
	acc.register(user).then(function (val){
		val ? res.send('1') : res.send('0')
	})
})

router.get('/logout', function (req, res){
	if(req.user){ req.logout() }
	res.redirect('/')
})

router.get('*', function (req, res) {
	//catch all other requests
	res.sendFile('index.html', { root: path.join(__dirname, '../views') })
})

module.exports = router