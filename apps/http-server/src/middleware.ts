import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from "jsonwebtoken"

import { JWT_SECRET } from '@repo/backend-common/config';

const middleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) { 
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded) {
            req.userId = (decoded as JwtPayload).userId;
        }
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}
export default middleware;