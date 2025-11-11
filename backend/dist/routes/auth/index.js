"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const driver_1 = __importDefault(require("./driver"));
const student_1 = __importDefault(require("./student"));
const router = express_1.default.Router();
router.use('/', driver_1.default);
router.use('/', student_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map