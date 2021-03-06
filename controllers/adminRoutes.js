const express = require('express')
const router = express.Router()

const db = require('../config/db')
const admin = require('../src/admin')
const acc = require('../src/account')

var auth = function (req, res, next){
	if (req.isAuthenticated() && req.user.type === db.ADMIN){
		return next()
	}
	res.sendStatus(401)
}

router.post('/admin/add', auth, function (req, res){
	admin.add(req.body.type, req.body.data).then(function (result){
		res.json(result)
	})
})

router.post('/admin/view', auth, function (req, res){
	admin.view(req.body.type).then(function (result){
		if(result){ return res.json(result) }
		res.sendStatus(400)
	})
})

router.post('/admin/edit', auth, function (req, res){
	admin.edit(req.body.type, req.body.name, req.body.id).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/deactivate', auth, function (req, res){
	admin.deactivate(req.body.type, req.body.id).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/activate', auth, function (req, res){
	admin.activate(req.body.type, req.body.id).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/delete', auth, function (req, res){
	admin.delete(req.body.type, req.body.id).then(function (result){
		res.json(result)
	})
})

router.post('/admin/viewAdmins', auth, function (req, res){
	admin.viewAdmins(req.user.id).then(function (result){
		if(result){ return res.json(result) }
		res.sendStatus(400)
	})
})

router.post('/admin/viewDoctors', auth, function (req, res){
	admin.viewDoctors().then(function (result){
		if(result){ return res.json(result) }
		res.sendStatus(400)
	})
})

router.post('/admin/verifyDoctor', auth, function (req, res){
	admin.verifyDoctor(req.body.user).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/denyDoctor', auth, function (req, res){
	admin.denyDoctor(req.body.user).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/unverifyDoctor', auth, function (req, res){
	admin.unverifyDoctor(req.body.user).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/createAdmin', auth, function (req, res){
	var user = {
		type: db.ADMIN,
		first: '',
		last: '',
		email: req.body.data.email,
		pass: req.body.data.password
	}
	acc.register(user).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

router.post('/admin/deleteAdmin', auth, function (req, res){
	acc.findUserByEmail(req.body.email).then(function(user){
		acc.deleteUser(user.userID).then(function (result){
			res.sendStatus(result ? 200 : 400)
		})
	})
})

router.post('/admin/getAdmin', auth, function (req, res){
	admin.getAdmin(req.user.id).then(function (result){
		if(result){
			return res.json(result) }
		res.sendStatus(400)
	})
})

router.post('/admin/changePassword', auth, function (req, res){
	acc.changePassword(req.body.newPass, req.body.curPass, req.user.id).then(function (result){
		res.sendStatus(result ? 200 : 400)
	})
})

module.exports = router
