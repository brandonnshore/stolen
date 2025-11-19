import { Request, Response, NextFunction } from 'express';
export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const getSignedUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload shirt photo and start extraction job
 * POST /api/uploads/shirt-photo
 */
export declare const uploadShirtPhoto: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=uploadController.d.ts.map