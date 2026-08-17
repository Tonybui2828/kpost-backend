import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(email: string, pass: string, name: string): Promise<{
        message: string;
        userId: string;
    }>;
    login(user: any): Promise<{
        access_token: string;
    }>;
}
