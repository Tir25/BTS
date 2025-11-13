"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachAdminBroadcastFunctions = exports.broadcastAssignmentRemoval = exports.broadcastAssignmentUpdate = exports.setupStudentHandler = exports.setupDriverHandler = exports.cleanupLocationRateLimiter = exports.setupBusLocationHandler = exports.setupConnectionManager = exports.globalIO = exports.initializeWebSocket = void 0;
var socketServer_1 = require("./socketServer");
Object.defineProperty(exports, "initializeWebSocket", { enumerable: true, get: function () { return socketServer_1.initializeWebSocket; } });
Object.defineProperty(exports, "globalIO", { enumerable: true, get: function () { return socketServer_1.globalIO; } });
__exportStar(require("./socketEvents"), exports);
__exportStar(require("./socketTypes"), exports);
__exportStar(require("./socketUtils"), exports);
var connectionManager_1 = require("./connectionManager");
Object.defineProperty(exports, "setupConnectionManager", { enumerable: true, get: function () { return connectionManager_1.setupConnectionManager; } });
var busLocationHandler_1 = require("./busLocationHandler");
Object.defineProperty(exports, "setupBusLocationHandler", { enumerable: true, get: function () { return busLocationHandler_1.setupBusLocationHandler; } });
Object.defineProperty(exports, "cleanupLocationRateLimiter", { enumerable: true, get: function () { return busLocationHandler_1.cleanupLocationRateLimiter; } });
var driverHandler_1 = require("./driverHandler");
Object.defineProperty(exports, "setupDriverHandler", { enumerable: true, get: function () { return driverHandler_1.setupDriverHandler; } });
var studentHandler_1 = require("./studentHandler");
Object.defineProperty(exports, "setupStudentHandler", { enumerable: true, get: function () { return studentHandler_1.setupStudentHandler; } });
var adminHandler_1 = require("./adminHandler");
Object.defineProperty(exports, "broadcastAssignmentUpdate", { enumerable: true, get: function () { return adminHandler_1.broadcastAssignmentUpdate; } });
Object.defineProperty(exports, "broadcastAssignmentRemoval", { enumerable: true, get: function () { return adminHandler_1.broadcastAssignmentRemoval; } });
Object.defineProperty(exports, "attachAdminBroadcastFunctions", { enumerable: true, get: function () { return adminHandler_1.attachAdminBroadcastFunctions; } });
//# sourceMappingURL=index.js.map