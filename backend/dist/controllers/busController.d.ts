import { Request, Response } from 'express';
export declare class BusController {
    static getAllBuses(req: Request, res: Response): Promise<void>;
    static getBusById(req: Request, res: Response): Promise<void>;
    static createBus(req: Request, res: Response): Promise<void>;
    static updateBus(req: Request, res: Response): Promise<void>;
    static deleteBus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=busController.d.ts.map