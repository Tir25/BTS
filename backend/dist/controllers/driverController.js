"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverController = void 0;
const DriverDatabaseService_1 = require("../services/database/DriverDatabaseService");
const OptimizedLocationService_1 = require("../services/OptimizedLocationService");
const logger_1 = require("../utils/logger");
class DriverController {
    static async getAllDrivers(req, res) {
        try {
            const drivers = await DriverDatabaseService_1.DriverDatabaseService.getAllDrivers();
            res.json({
                success: true,
                data: drivers,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching drivers', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch drivers',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async getDriverById(req, res) {
        try {
            const { driverId } = req.params;
            const driver = await DriverDatabaseService_1.DriverDatabaseService.getDriverById(driverId);
            if (!driver) {
                res.status(404).json({
                    success: false,
                    error: 'Driver not found',
                    message: `Driver with ID ${driverId} not found`,
                });
                return;
            }
            res.json({
                success: true,
                data: driver,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching driver', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch driver',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async getDriverBusInfo(req, res) {
        try {
            const { driverId } = req.params;
            const busInfo = await OptimizedLocationService_1.optimizedLocationService.getDriverBusInfo(driverId);
            if (!busInfo) {
                res.status(404).json({
                    success: false,
                    error: 'Bus not found',
                    message: `No bus assigned to driver ${driverId}`,
                });
                return;
            }
            res.json({
                success: true,
                data: { busInfo },
                message: 'Driver bus information retrieved successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting driver bus info', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to get driver bus information',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async createDriver(req, res) {
        try {
            const driverData = req.body;
            if (!driverData.email ||
                !driverData.first_name ||
                !driverData.last_name ||
                !driverData.password) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Email, first name, last name, and password are required',
                });
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(driverData.email)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid email format',
                    message: 'Please provide a valid email address',
                });
                return;
            }
            if (driverData.password.length < 6) {
                res.status(400).json({
                    success: false,
                    error: 'Weak password',
                    message: 'Password must be at least 6 characters long',
                });
                return;
            }
            if (driverData.first_name.trim().length === 0 || driverData.last_name.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid name',
                    message: 'First name and last name cannot be empty',
                });
                return;
            }
            if (driverData.phone && typeof driverData.phone !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Invalid phone',
                    message: 'Phone number must be a string',
                });
                return;
            }
            const startTime = Date.now();
            logger_1.logger.info('Creating driver', 'driver-controller', { email: driverData.email, startTime });
            try {
                const newDriver = await DriverDatabaseService_1.DriverDatabaseService.createDriver(driverData);
                const duration = Date.now() - startTime;
                logger_1.logger.info('Driver created successfully', 'driver-controller', {
                    driverId: newDriver.id,
                    email: newDriver.email,
                    duration: `${duration}ms`
                });
                const isActive = newDriver.is_active !== undefined ? newDriver.is_active : true;
                res.status(201).json({
                    success: true,
                    data: newDriver,
                    message: isActive ? 'Driver created successfully with Supabase Auth account' : 'Driver reactivated successfully',
                    timestamp: new Date().toISOString(),
                });
            }
            catch (createError) {
                const duration = Date.now() - startTime;
                logger_1.logger.error('Error in createDriver service call', 'driver-controller', {
                    error: createError instanceof Error ? createError.message : 'Unknown error',
                    duration: `${duration}ms`,
                    email: driverData.email
                });
                throw createError;
            }
        }
        catch (error) {
            logger_1.logger.error('Error creating driver', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            let errorMessage = 'Unknown error occurred';
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    statusCode = 409;
                    errorMessage = error.message;
                }
                else if (error.message.includes('converting user from student to driver')) {
                    statusCode = 500;
                    errorMessage = 'Error while converting student to driver. Please try again or contact support.';
                }
                else if (error.message.includes('Invalid email format') ||
                    error.message.includes('Weak password') ||
                    error.message.includes('Invalid name') ||
                    error.message.includes('Invalid phone')) {
                    statusCode = 400;
                    errorMessage = error.message;
                }
                else if (error.message.includes('Missing required fields')) {
                    statusCode = 400;
                    errorMessage = error.message;
                }
                else if (error.message.includes('Supabase')) {
                    statusCode = 400;
                    errorMessage = error.message;
                }
                else {
                    errorMessage = error.message;
                }
            }
            res.status(statusCode).json({
                success: false,
                error: 'Failed to create driver',
                message: errorMessage,
            });
        }
    }
    static async updateDriver(req, res) {
        try {
            const { driverId } = req.params;
            const driverData = req.body;
            const updatedDriver = await DriverDatabaseService_1.DriverDatabaseService.updateDriver(driverId, driverData);
            if (!updatedDriver) {
                res.status(404).json({
                    success: false,
                    error: 'Driver not found',
                    message: `Driver with ID ${driverId} not found`,
                });
                return;
            }
            res.json({
                success: true,
                data: updatedDriver,
                message: 'Driver updated successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating driver', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to update driver',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async deleteDriver(req, res) {
        try {
            const { driverId } = req.params;
            const deletedDriver = await DriverDatabaseService_1.DriverDatabaseService.deleteDriver(driverId);
            if (!deletedDriver) {
                res.status(404).json({
                    success: false,
                    error: 'Driver not found',
                    message: `Driver with ID ${driverId} not found`,
                });
                return;
            }
            res.json({
                success: true,
                data: deletedDriver,
                message: 'Driver deleted successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting driver', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to delete driver',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    static async cleanupInactiveDrivers(req, res) {
        try {
            const result = await DriverDatabaseService_1.DriverDatabaseService.cleanupInactiveDrivers();
            res.json({
                success: true,
                data: result,
                message: `Cleanup completed: ${result.cleaned} drivers cleaned, ${result.errors.length} errors`,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up inactive drivers', 'driver-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            res.status(500).json({
                success: false,
                error: 'Failed to clean up inactive drivers',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.DriverController = DriverController;
//# sourceMappingURL=driverController.js.map