import { join } from "https://deno.land/x/oak@v17.1.4/deps.ts";
import { Conexion } from "./conexion.ts";

interface ProductData{
    idproducto: number |null;
    imagen:string;
    codigo:string;
    nombre:string;
    descripcion:string;
    precio:number;
    stock:number;

}


export class Product{

    public _ObjProduct :ProductData| null;


    constructor(ObjProduct:ProductData| null = null){
        this._ObjProduct = ObjProduct;
    }


    public async ListarProductos():Promise<ProductData[]>{
        try {
            const result = await Conexion.execute("SELECT * FROM tienda_deno");


            if (!result || !result.rows) {
                 console.log("La consulta no salio como se esperaba!");
                 return[];
            }


            return result.rows as ProductData[];
        } catch (error) {
            console.error("Error al seleccionar Usuarios",error);
            throw new Error("No se pudieron obtener Datos");
        }
    }


    public async InsertarProducto():Promise<{success:boolean;message:string;producto? :Record<string,unknown>}>{
        try {
            if (!this._ObjProduct) {
                throw new Error("No se ha proporcionado un objeto valido");
            }

            const {imagen,codigo,nombre,descripcion,precio,stock} = this._ObjProduct
            if (!imagen||!codigo||!nombre||!descripcion||!precio||!stock) {
                throw new Error ("Faltan datos requeridos para insertar el producto")
            }

            await Conexion.execute("START TRANSACTION");

            const result = await Conexion.execute("INSERT INTO tienda_deno(imagen,codigo,nombre,descripcion,precio,stock) VALUES (?,?,?,?,?,?)",
                [
                    imagen,
                    codigo,
                    nombre,
                    descripcion,
                    precio,
                    stock,
                ],
            );

            if (result && typeof result.affectedRows === "number" && result.affectedRows>0) {
                const[product] = await Conexion.query("SELECT * FROM tienda_deno WHERE idproducto= LAST_INSERT_ID()",)
                    await Conexion.execute("COMMIT");
                    return {
                        success:true,
                        message:"Producto insertado correctamente",
                        producto:product,
                    }
            }else{
                throw new Error("No se pudo insertar el Productos");
            }
        } catch (error) {
            if (error instanceof Error) {
                return{
                    success:false,
                    message:error.message
                };
            } else {
                return {
                    success:false,
                    message:"Error al interno del servidor"
                }
            }
        }
    }

    public async ActualizarProducto(): Promise<{ success: boolean; message: string; producto?: Record<string, unknown> }> {
  try {
    if (!this._ObjProduct) {
      throw new Error("No se ha proporcionado un producto válido.");
    }

    const { idproducto, imagen, codigo, nombre, descripcion, precio, stock } = this._ObjProduct;

    if (
      idproducto == null || !imagen || !codigo || !nombre || !descripcion ||
      typeof precio !== "number" || typeof stock !== "number"
    ) {
      throw new Error("Faltan datos requeridos para actualizar el producto.");
    }

    await Conexion.execute("START TRANSACTION");

    const update = await Conexion.execute(
      `UPDATE tienda_deno 
       SET imagen = ?, codigo = ?, nombre = ?, descripcion = ?, precio = ?, stock = ? 
       WHERE idproducto = ?`,
      [imagen, codigo, nombre, descripcion, precio, stock, idproducto]
    );

    if (update && typeof update.affectedRows === "number" && update.affectedRows > 0) {
      const [updated] = await Conexion.query(
        "SELECT * FROM tienda_deno WHERE idproducto = ?",
        [idproducto]
      );

      await Conexion.execute("COMMIT");

      return {
        success: true,
        message: "Producto actualizado correctamente.",
        producto: updated,
      };
    } else {
      throw new Error("No se pudo actualizar el producto.");
    }
  } catch (error) {
    await Conexion.execute("ROLLBACK");

    return {
      success: false,
      message: error instanceof Error ? error.message : "Error interno al actualizar el producto.",
    };
  }
    }

   public async eliminarProducto(idproducto: number, ): Promise<{ success: boolean; message: string }> {
    try {
      //Obtener el codigo para eliminar la carpeta
      const [Obtenercodigo] = await Conexion.query(
        "SELECT codigo FROM tienda_deno WHERE idproducto = ?", [idproducto],
      );

      const codigo = Obtenercodigo?.codigo as string | undefined;
      if (!codigo) {
        return { success: false, message: "Producto no encontrado" };
      }

      //Eliminar
      await Conexion.execute("START TRANSACTION");
      const eliminar = await Conexion.execute(
        "DELETE FROM tienda_deno WHERE idproducto = ?",
        [
          idproducto,
        ],
      );

      if (
        eliminar && typeof eliminar.affectedRows === "number" &&
        eliminar.affectedRows > 0
      ) {
        await Conexion.execute("COMMIT");

        const dir = join(Deno.cwd(), "uploads", codigo);
        try {
          await Deno.remove(dir, { recursive: true });
        } catch (error) {
          console.warn(
            "No se puede eliminar la carpeta del producto" + dir + " " + error,
          );
        }

        return {
          success: true,
          message: "Producto elimminado correctamente",
        };
      } else {
        throw new Error("No es Posible Eliminar el producto!!!");
      }
    } catch (error) {
      await Conexion.execute("ROLLBACK");
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: "Error Interno del Servidor!!!" };
      }
    }
  }


}


