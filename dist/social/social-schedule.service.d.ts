import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';
export declare class SocialScheduleService {
    private prisma;
    private facebookService;
    private readonly logger;
    constructor(prisma: PrismaService, facebookService: FacebookService);
    handleCron(): Promise<void>;
}
