import { Router } from "../Dependencies/dependecies.ts";
import { getProduct , postProducto , putProducto, deleteProducto} from "../Controller/ProductControlle.ts";

const ProductRouter = new Router();

ProductRouter.get("/product",getProduct),
ProductRouter.post("/product",postProducto),
ProductRouter.put("/product",putProducto),
ProductRouter.delete("/product/:id",deleteProducto)

export{ProductRouter}