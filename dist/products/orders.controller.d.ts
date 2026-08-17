import { PrismaService } from '../prisma.service';
import { ShippingService } from './shipping.service';
export declare class OrdersController {
    private prisma;
    private shippingService;
    constructor(prisma: PrismaService, shippingService: ShippingService);
    createOrder(body: any): Promise<{
        id: string;
        workspaceId: string;
        status: string;
        createdAt: Date;
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        totalAmount: number;
        shippingCode: string | null;
        shippingFee: number | null;
        weight: number | null;
        carrierName: string | null;
    }>;
    getOrders(workspaceId: string): Promise<({
        workspace: {
            name: string;
            id: string;
            createdAt: Date;
            ownerId: string;
            phoneNumber: string | null;
            plan: string;
            planExpiry: Date | null;
            isAutoPay: boolean;
            balance: number;
            vtpToken: string | null;
            vtpShopId: string | null;
            senderAddress: string | null;
            senderProvince: string | null;
            senderDistrict: string | null;
        };
        items: ({
            product: {
                name: string;
                id: string;
                workspaceId: string;
                description: string | null;
                price: number | null;
                imageUrl: string | null;
                productUrl: string | null;
                skuInternal: string;
                totalStock: number;
            };
        } & {
            id: string;
            price: number;
            quantity: number;
            productId: string;
            orderId: string;
        })[];
    } & {
        id: string;
        workspaceId: string;
        status: string;
        createdAt: Date;
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        totalAmount: number;
        shippingCode: string | null;
        shippingFee: number | null;
        weight: number | null;
        carrierName: string | null;
    })[]>;
    shipOrder(id: string): Promise<{
        id: string;
        workspaceId: string;
        status: string;
        createdAt: Date;
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        totalAmount: number;
        shippingCode: string | null;
        shippingFee: number | null;
        weight: number | null;
        carrierName: string | null;
    }>;
    getShippingSettings(workspaceId: string): Promise<{
        vtpToken: string;
        vtpShopId: string;
    }>;
    updateShippingSettings(workspaceId: string, body: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        ownerId: string;
        phoneNumber: string | null;
        plan: string;
        planExpiry: Date | null;
        isAutoPay: boolean;
        balance: number;
        vtpToken: string | null;
        vtpShopId: string | null;
        senderAddress: string | null;
        senderProvince: string | null;
        senderDistrict: string | null;
    }>;
    updateOrder(id: string, body: any): Promise<{
        id: string;
        workspaceId: string;
        status: string;
        createdAt: Date;
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        totalAmount: number;
        shippingCode: string | null;
        shippingFee: number | null;
        weight: number | null;
        carrierName: string | null;
    }>;
    deleteOrder(id: string): Promise<{
        id: string;
        workspaceId: string;
        status: string;
        createdAt: Date;
        customerName: string;
        customerPhone: string | null;
        customerAddress: string | null;
        province: string | null;
        district: string | null;
        ward: string | null;
        totalAmount: number;
        shippingCode: string | null;
        shippingFee: number | null;
        weight: number | null;
        carrierName: string | null;
    }>;
    bulkDelete(body: {
        ids: string[];
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
