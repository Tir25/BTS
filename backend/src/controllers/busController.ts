/**
 * Bus Controller
 * Handles HTTP requests for bus management endpoints
 * Delegates business logic to BusDatabaseService
 */

import { Request, Response } from 'express';
import { BusDatabaseService } from '../services/database/BusDatabaseService';
import { logger } from '../utils/logger';

export class BusController {
  /**
   * Get all buses with driver and route information
   */
  static async getAllBuses(req: Request, res: Response): Promise<void> {
    try {
      const buses = await BusDatabaseService.getAllBuses();
      res.json({
        success: true,
        data: buses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching buses', 'bus-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch buses',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get specific bus
   */
  static async getBusById(req: Request, res: Response): Promise<void> {
    try {
      const { busId } = req.params;
      const bus = await BusDatabaseService.getBusById(busId);

      if (!bus) {
        res.status(404).json({
          success: false,
          error: 'Bus not found',
          message: `Bus with ID ${busId} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: bus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching bus', 'bus-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bus',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create new bus
   */
  static async createBus(req: Request, res: Response): Promise<void> {
    try {
      const busData = req.body;

      // Support both naming conventions (code/bus_number and bus_number/vehicle_no)
      const busNumber = busData.bus_number || busData.code;
      const vehicleNo = busData.vehicle_no || busData.bus_number;
      const capacity = busData.capacity;

      // Enhanced validation
      if (!busNumber || !vehicleNo || !capacity) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Bus number, vehicle number and capacity are required',
        });
        return;
      }

      // Validate capacity first - ensure it's a valid number
      const capacityNum = typeof capacity === 'number' ? capacity : parseInt(String(capacity), 10);
      if (isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 1000) {
        res.status(400).json({
          success: false,
          error: 'Invalid capacity',
          message: 'Capacity must be a number between 1 and 1000',
        });
        return;
      }

      // Normalize the data to backend format
      const normalizedBusData: any = {
        bus_number: String(busNumber).trim(),
        vehicle_no: String(vehicleNo).trim(),
        capacity: capacityNum,
        model: busData.model ? String(busData.model).trim() : null,
        year: busData.year ? parseInt(String(busData.year), 10) : null,
        bus_image_url: busData.bus_image_url ? String(busData.bus_image_url).trim() : null,
        // PRODUCTION FIX: Properly handle null/empty string for driver and route IDs
        assigned_driver_profile_id: busData.assigned_driver_profile_id && busData.assigned_driver_profile_id !== '' ? String(busData.assigned_driver_profile_id).trim() : null,
        route_id: busData.route_id && busData.route_id !== '' ? String(busData.route_id).trim() : null,
        // Handle boolean conversion
        is_active: busData.is_active === 'on' || busData.is_active === true || busData.is_active === 'true' || busData.is_active === undefined
      };

      // Validate year if provided
      if (normalizedBusData.year && (typeof normalizedBusData.year !== 'number' || normalizedBusData.year < 1900 || normalizedBusData.year > new Date().getFullYear() + 10)) {
        res.status(400).json({
          success: false,
          error: 'Invalid year',
          message: 'Year must be between 1900 and ' + (new Date().getFullYear() + 10),
        });
        return;
      }

      const newBus = await BusDatabaseService.createBus(normalizedBusData);

      // Check if bus was reactivated (has updated_at close to created_at)
      const wasReactivated = newBus.updated_at && newBus.created_at && 
        new Date(newBus.updated_at).getTime() - new Date(newBus.created_at).getTime() < 5000;

      res.status(201).json({
        success: true,
        data: newBus,
        message: wasReactivated ? 'Bus reactivated and updated successfully' : 'Bus created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating bus', 'bus-controller', { error: error instanceof Error ? error.message : 'Unknown error' });

      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      let statusCode = 500;

      if (error instanceof Error) {
        // Check for database constraint violations
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint') || error.message.includes('already exists')) {
          statusCode = 409; // Conflict
          errorMessage = error.message.includes('bus_number') 
            ? `Bus number already exists. Please use a different bus number.`
            : error.message.includes('vehicle_no')
            ? `Vehicle number already exists. Please use a different vehicle number.`
            : error.message;
        } else if (error.message.includes('already assigned')) {
          statusCode = 409; // Conflict
          errorMessage = error.message;
        } else if (error.message.includes('not found') || error.message.includes('not active')) {
          statusCode = 400; // Bad Request
          errorMessage = error.message;
        } else if (error.message.includes('Missing required fields')) {
          statusCode = 400; // Bad Request
          errorMessage = error.message;
        } else if (error.message.includes('violates') || error.message.includes('constraint')) {
          statusCode = 400; // Bad Request
          errorMessage = error.message.includes('capacity') 
            ? 'Capacity must be between 1 and 1000'
            : error.message.includes('year')
            ? 'Year must be between 1900 and ' + (new Date().getFullYear() + 10)
            : 'Invalid data provided. Please check all fields.';
        } else {
          errorMessage = error.message || 'Unknown error occurred';
        }
      }

      res.status(statusCode).json({
        success: false,
        error: 'Failed to create bus',
        message: errorMessage,
      });
    }
  }

  /**
   * Update bus
   */
  static async updateBus(req: Request, res: Response): Promise<void> {
    try {
      const { busId } = req.params;
      const busData = req.body;

      const updatedBus = await BusDatabaseService.updateBus(busId, busData);

      if (!updatedBus) {
        res.status(404).json({
          success: false,
          error: 'Bus not found',
          message: `Bus with ID ${busId} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: updatedBus,
        message: 'Bus updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating bus', 'bus-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to update bus',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete bus
   */
  static async deleteBus(req: Request, res: Response): Promise<void> {
    try {
      const { busId } = req.params;
      const deletedBus = await BusDatabaseService.deleteBus(busId);

      if (!deletedBus) {
        res.status(404).json({
          success: false,
          error: 'Bus not found',
          message: `Bus with ID ${busId} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: deletedBus,
        message: 'Bus deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting bus', 'bus-controller', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({
        success: false,
        error: 'Failed to delete bus',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

