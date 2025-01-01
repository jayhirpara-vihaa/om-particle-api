import { Router } from "express";
import { addStockFn, deleteStockFn, getAllStockFn, getStockFn, updateStockFn, updateStockStatusFn } from "../../controllers/admin/stock.controller";
import { adminAuthorization } from "../../middlewares/authenticate";
import { addStockValidator } from "../../validators/stock/stock.validator";
export default (app: Router) => {
    app.post("/stock", [adminAuthorization, addStockValidator], addStockFn);
    app.put("/stock/:diamond_id", [adminAuthorization, addStockValidator], updateStockFn);
    app.get("/stock", [adminAuthorization], getAllStockFn);
    app.get("/stock/:diamond_id", [adminAuthorization], getStockFn);
    app.patch("/stock/:diamond_id", [adminAuthorization], updateStockStatusFn);
    app.delete("/stock/:diamond_id", [adminAuthorization], deleteStockFn);
}