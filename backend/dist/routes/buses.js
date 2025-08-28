"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const locationService_1 = require("../services/locationService");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { driver_id } = req.query;
        if (driver_id) {
            const buses = await (0, locationService_1.getAllBuses)();
            const filteredBuses = buses.filter(bus => bus.assigned_driver_id === driver_id);
            res.json({
                success: true,
                data: filteredBuses,
                timestamp: new Date().toISOString(),
            });
        }
        else {
            const buses = await (0, locationService_1.getAllBuses)();
            res.json({
                success: true,
                data: buses,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        console.error('❌ Error fetching buses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch buses',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const busInfo = await (0, locationService_1.getBusInfo)(busId);
        if (!busInfo) {
            return res.status(404).json({
                success: false,
                error: 'Bus not found',
                message: `Bus with ID ${busId} not found`,
            });
        }
        return res.json({
            success: true,
            data: busInfo,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ Error fetching bus info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch bus information',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=buses.js.map