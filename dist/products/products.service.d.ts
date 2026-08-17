import { PrismaService } from '../prisma.service';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: any): Promise<{
        name: string;
        id: string;
        workspaceId: string;
        description: string | null;
        price: number | null;
        imageUrl: string | null;
        productUrl: string | null;
        skuInternal: string;
        totalStock: number;
    }>;
    findAll(workspaceId: string): Promise<{
        name: string;
        id: string;
        workspaceId: string;
        description: string | null;
        price: number | null;
        imageUrl: string | null;
        productUrl: string | null;
        skuInternal: string;
        totalStock: number;
    }[]>;
    remove(id: string): Promise<{
        name: string;
        id: string;
        workspaceId: string;
        description: string | null;
        price: number | null;
        imageUrl: string | null;
        productUrl: string | null;
        skuInternal: string;
        totalStock: number;
    }>;
    update(id: string, data: any): Promise<{
        name: string;
        id: string;
        workspaceId: string;
        description: string | null;
        price: number | null;
        imageUrl: string | null;
        productUrl: string | null;
        skuInternal: string;
        totalStock: number;
    }>;
}
