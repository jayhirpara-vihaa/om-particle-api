import { fieldFloatChain, fieldIntegerChain, fieldStringChain } from "../common-validation-rules";

export const addStockRules = [
    fieldStringChain("Stock Id", "stock_id"),
    fieldStringChain("Status", "status"),
    fieldFloatChain("weight", "weight"),
    fieldFloatChain("rate", "rate"),
    fieldFloatChain("Table value", "table_value"),
    fieldFloatChain("Depth value", "depth_value"),
    fieldStringChain("video", "video"),
    fieldStringChain("image", "image"),
    fieldStringChain("certificate", "certificate"),
    fieldStringChain("measurement", "measurement"),
    fieldStringChain("ratio", "ratio"),
    fieldStringChain("User comments", "userComments"),
    fieldStringChain("Admin comments", "adminComments"),
    fieldIntegerChain("shape", "shape"),
    fieldIntegerChain("quantity", "quantity"),
    fieldIntegerChain("color", "color"),
    fieldIntegerChain("color_intensity", "color_intensity"),
    fieldIntegerChain("clarity", "clarity"),
    fieldIntegerChain("lab", "lab"),
    fieldIntegerChain("report", "report"),
    fieldIntegerChain("polish", "polish"),
    fieldIntegerChain("symmetry", "symmetry"),
    fieldIntegerChain("company", "company_id"),
    fieldIntegerChain("fluorescence", "fluorescence"),
]