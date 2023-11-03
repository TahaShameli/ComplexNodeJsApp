const express = require('express');
const router = express.Router();

const userController = require('./controllers/userController');
const postController = require('./controllers/postController');
const followController = require('./controllers/followController');

// User related routes
router.get('/', userController.home);
router.post('/register', userController.register);
router.post('/login', userController.login)
router.post('/logout', userController.logout)

router.post('/doesUsernameExist', userController.doesUsernameExit)
router.post('/doesEmailExist', userController.doesEmailExist)

// Profile related routes
router.get('/profile/:username', userController.ifUserExits, userController.sharedProfileData, userController.profilePostsScreen)
router.get('/profile/:username/followers', userController.ifUserExits, userController.sharedProfileData, userController.profileFollowersScreen)
router.get('/profile/:username/following', userController.ifUserExits, userController.sharedProfileData, userController.profileFollowingScreen)

// Post related routes
router.get('/post/:id', postController.viewSingle);

router.get('/create-post', userController.mustBeLoggedIn, postController.viewCreateScreen);
router.post('/create-post', userController.mustBeLoggedIn, postController.create);

router.get('/post/:id/edit', userController.mustBeLoggedIn, postController.viewEditScreen);
router.post('/post/:id/edit', userController.mustBeLoggedIn, postController.edit);
router.post('/post/:id/delete', userController.mustBeLoggedIn, postController.delete);

router.post('/search', postController.search)

// Follow related routes
router.post('/addFollow/:username', userController.mustBeLoggedIn, followController.addFollow)
router.post('/removeFollow/:username', userController.mustBeLoggedIn, followController.removeFollow)

module.exports = router;