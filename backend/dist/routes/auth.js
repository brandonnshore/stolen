"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const authValidation_1 = require("../validators/authValidation");
const router = (0, express_1.Router)();
router.post('/login', authValidation_1.loginValidation, validate_1.validate, authController_1.login);
router.post('/register', authValidation_1.registerValidation, validate_1.validate, authController_1.register);
router.post('/signup', authValidation_1.registerValidation, validate_1.validate, authController_1.register); // Alias for register
router.post('/oauth/sync', authValidation_1.oauthSyncValidation, validate_1.validate, authController_1.oauthSync);
router.get('/me', auth_1.authenticate, authController_1.me);
exports.default = router;
//# sourceMappingURL=auth.js.map