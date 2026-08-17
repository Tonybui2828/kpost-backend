"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const admin_service_1 = require("./admin.service");
describe('AdminService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [admin_service_1.AdminService],
        }).compile();
        service = module.get(admin_service_1.AdminService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=admin.service.spec.js.map