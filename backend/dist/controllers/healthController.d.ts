import { Request, Response } from 'express';
export declare class HealthController {
    static getHealth(req: Request, res: Response): Promise<void>;
    static getDetailedHealth(req: Request, res: Response): Promise<void>;
    static getReadiness(req: Request, res: Response): Promise<void>;
    static getLiveness(req: Request, res: Response): Promise<void>;
    static getWebSocketHealth(req: Request, res: Response): Promise<void>;
    static getConnectionPoolHealth(req: Request, res: Response): Promise<void>;
    static getMetrics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=healthController.d.ts.map