import { Request, Response } from 'express';
export declare class DriverController {
    static getAllDrivers(req: Request, res: Response): Promise<void>;
    static getDriverById(req: Request, res: Response): Promise<void>;
    static getDriverBusInfo(req: Request, res: Response): Promise<void>;
    static createDriver(req: Request, res: Response): Promise<void>;
    static updateDriver(req: Request, res: Response): Promise<void>;
    static deleteDriver(req: Request, res: Response): Promise<void>;
    static cleanupInactiveDrivers(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=driverController.d.ts.map