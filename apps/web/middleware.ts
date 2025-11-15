
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from "jsonwebtoken"
import { JwtPayload } from 'jsonwebtoken'
export default async function middleware(req:NextRequest) {
    const { pathname } = req.nextUrl

    const authHeader = req.headers.get("authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    let isAuthenticated = false;

    if (token) {
        try {
            const verified = jwt.verify(token, "jwt_secret_hardcoded") as JwtPayload;
            if (verified) isAuthenticated = true;
        } catch (err) {
           
            isAuthenticated = false;
        }
    }

    if (pathname === "/ws-path") {
        if (!isAuthenticated) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const wsUrl = `${`http://localhost:8000`}?token=${token}`;
        return NextResponse.json({ wsUrl });
    }

    if (isAuthenticated && (pathname === "/signin" || pathname === "/signup")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!isAuthenticated && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    return NextResponse.next();
}



export const config = {
    matcher: [
        "/signin",
        "/signup",
        "/dashboard/:path*", 
        "/ws-path", 
    ],
}