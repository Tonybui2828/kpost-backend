"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const admin_controller_1 = require("./admin.controller");
describe('AdminController', () => {
    let controller;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [admin_controller_1.AdminController],
        }).compile();
        controller = module.get(admin_controller_1.AdminController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=admin.controller.spec.js.map