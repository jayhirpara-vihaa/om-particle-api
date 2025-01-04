import { Router } from "express";
import masterRoute from "./master.route";
import adminRoute from "./admin.route";
import countryRoute from "./country.route";
import companyRoute from "./company.route";
import stockRoute from "./stock.route";
import staticPageRoute from "./static-page.route";
import memoRoute from "./memo.route";
import invoiceRoute from "./invoice.route";
import conciergeRoute from "./concierge.route";

export default function adminRouter() {
  const app = Router();
  masterRoute(app);
  adminRoute(app);
  countryRoute(app);
  companyRoute(app);
  stockRoute(app);
  staticPageRoute(app);
  memoRoute(app);
  invoiceRoute(app);
  conciergeRoute(app);
  return app;
}
