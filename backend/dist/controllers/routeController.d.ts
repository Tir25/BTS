import { Request, Response } from 'express';
export declare class RouteController {
    static getAllRoutes(req: Request, res: Response): Promise<void>;
    static getRoutesInViewport(req: Request, res: Response): Promise<void>;
    static getRouteById(req: Request, res: Response): Promise<void>;
    static createRoute(req: Request, res: Response): Promise<void>;
    static updateRoute(req: Request, res: Response): Promise<void>;
    static deleteRoute(req: Request, res: Response): Promise<void>;
    static assignBusToRoute(req: Request, res: Response): Promise<void>;
    static calculateETA(req: Request, res: Response): Promise<void>;
    static checkBusNearStop(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=routeController.d.ts.map