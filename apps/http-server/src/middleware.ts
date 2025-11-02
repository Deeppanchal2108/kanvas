import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from "jsonwebtoken"

// import { JWT_SECRET } from '@repo/backend-common/config';



const JWT_SECRET = "jwt_something";
interface AuthRequest extends Request { 
    userId?: string;
}
const middleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) { 
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (!decoded.userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
  
}
export default middleware;