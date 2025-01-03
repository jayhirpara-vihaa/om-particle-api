import { Router } from "express";
import { adminAuthorization } from "../../middlewares/authenticate";
import { createInvoiceFn } from "../../controllers/admin/invoice.controller";

export default (app: Router) => {
    app.post("/invoice", [adminAuthorization], createInvoiceFn)
}