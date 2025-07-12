import { Context, RouterContext} from "../Dependencies/dependecies.ts";
import { Product } from "../Models/pruductModel.ts";
import { z } from "../Dependencies/dependecies.ts";




// 🎯 Schema de validación para productos
export const productsSchema = z.object({
 imagen:z.string().min(1),
 codigo:z.string().min(1),
 nombre:z.string().min(1),
 descripcion:z.string().min(1),
 precio:z.number().min(1),
 stock:z.number().min(1)
});

// 📦 GET /productos
export const getProduct = async (ctx: Context) => {
  const { response } = ctx;

  try {
    const objProduct = new Product();
    const ListaProductos = await objProduct.ListarProductos();

    if (!ListaProductos || ListaProductos.length === 0) {
      response.status = 400;
      response.body = {
        success: false,
        message: "No se encontraron productos",
      };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      data: ListaProductos,
    };
  } catch (error) {
    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 📝 POST /productos
export const postProducto = async (ctx: Context) => {
  const { response, request } = ctx;

  try {
    const contentType = request.headers.get("Content-Type");
    console.log("→ Content-Type recibido:", contentType);

    // Caso: multipart/form-data
    if (contentType && contentType.includes("multipart/form-data")) {

      const formData = await request.body.formData();

      const nombre = formData.get("nombre")?.toString();
      const descripcion = formData.get("descripcion")?.toString();
      const codigo = formData.get("codigo")?.toString();
      const precioStr = formData.get("precio")?.toString();
      const stockStr = formData.get("stock")?.toString();
      const file = formData.get("imagen") as File;

      if (!nombre || !descripcion || !codigo || !precioStr || !stockStr) {
        response.status = 400;
        response.body = {
          success: false,
          message: "Faltan campos requeridos",
          received: { nombre, descripcion, codigo, precio: precioStr, stock: stockStr },
        };
        return;
      }

      const precio = Number(precioStr);
      const stock = Number(stockStr);

      let imagen = "";

      if (file && file.size > 0) {
        const uploadDir = `uploads/${codigo}`;
        try {
          await Deno.stat(uploadDir);
        } catch {
          await Deno.mkdir(uploadDir, { recursive: true });
        }

        const extension = file.name.split(".").pop() || "jpg";
        const uniqueName = `${nombre.replace(/\s+/g, "_")}_${codigo}.${extension}`;
        const destino = `${uploadDir}/${uniqueName}`;

        const data = new Uint8Array(await file.arrayBuffer());
        await Deno.writeFile(destino, data);

        imagen = destino;
      }

      const validated = productsSchema.parse({
        codigo,
        nombre,
        descripcion,
        precio,
        stock,
        imagen,
      });

      const productData = {
        idproducto: null,
        ...validated,
      };

      const objProduct = new Product(productData);
      const result = await objProduct.InsertarProducto();

      response.status = result.success ? 201 : 400;
      response.body = {
        success: result.success,
        message: result.success ? "Producto agregado correctamente" : result.message,
        ...(result.success ? { producto: result.producto } : {}),
      };
      return;
    }

    // Caso: application/json
    const contentLength = request.headers.get("Content-Length");
    if (contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        message: "El cuerpo de la solicitud está vacío",
      };
      return;
    }

    const body = await request.body.json();
    const validated = productsSchema.parse(
      body
    );

    const productoData = {
      idproducto: null,
      ...validated,
    };

    const objProducto = new Product(productoData);
    const agregar = await objProducto.InsertarProducto();

    response.status = agregar.success ? 201 : 400;
    response.body = {
      success: agregar.success,
      message: agregar.success ? "Producto agregado correctamente" : agregar.message,
      ...(agregar.success ? { producto: agregar.producto } : {}),
    };
  } catch (error) {
    console.error("Error en postProducto:", error);

    if (error instanceof z.ZodError) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Error de validación",
        errors: error.errors,
      };
    } else {
      response.status = 500;
      response.body = {
        success: false,
        message: "Error del servidor",
        error: String(error),
      };
    }
  }
};

export const putProducto = async (ctx: Context) => {
  const { response, request } = ctx;

  try {
    const contentType = request.headers.get("Content-Type");
    console.log("→ Content-Type recibido:", contentType);

    if (!contentType || !contentType.includes("multipart/form-data")) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El Content-Type debe ser multipart/form-data para editar con imagen",
      };
      return;
    }

    const formData = await request.body.formData();

    const idStr = formData.get("idproducto")?.toString();
    const nombre = formData.get("nombre")?.toString();
    const descripcion = formData.get("descripcion")?.toString();
    const codigo = formData.get("codigo")?.toString();
    const precioStr = formData.get("precio")?.toString();
    const stockStr = formData.get("stock")?.toString();
    const file = formData.get("imagen") as File;

    if (!idStr || !nombre || !descripcion || !codigo || !precioStr || !stockStr) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Faltan campos requeridos",
        received: { idStr, nombre, descripcion, codigo, precio: precioStr, stock: stockStr },
      };
      return;
    }

    const idproducto = Number(idStr);
    const precio = Number(precioStr);
    const stock = Number(stockStr);

    // Obtener imagen anterior
    const objConsulta = new Product();
    const productos = await objConsulta.ListarProductos();
    const actual = productos.find((p) => p.idproducto === idproducto);
    if (!actual) {
      response.status = 404;
      response.body = { success: false, message: "Producto no encontrado" };
      return;
    }

    let imagen = actual.imagen;

    // Procesar nueva imagen
    if (file && file.size > 0) {
      // Eliminar imagen anterior si existe
      try {
        await Deno.remove(actual.imagen);
        console.log("Imagen anterior eliminada:", actual.imagen);
      } catch (e) {
        console.warn("No se pudo eliminar imagen anterior:", actual.imagen);
      }

      const uploadDir = `uploads/${codigo}`;
      try {
        await Deno.stat(uploadDir);
      } catch {
        await Deno.mkdir(uploadDir, { recursive: true });
      }

      const extension = file.name.split(".").pop() || "jpg";
      const uniqueName = `${nombre.replace(/\s+/g, "_")}_${codigo}.${extension}`;
      const destino = `${uploadDir}/${uniqueName}`;

      const data = new Uint8Array(await file.arrayBuffer());
      await Deno.writeFile(destino, data);
      imagen = destino;
    }

    const validated = productsSchema.parse({ codigo, nombre, descripcion, precio, stock, imagen });

    const productoData = {
      idproducto,
      ...validated,
    };

    const objActualizar = new Product(productoData);
    const result = await objActualizar.ActualizarProducto();

    response.status = result.success ? 200 : 400;
    response.body = {
      success: result.success,
      message: result.success ? "Producto actualizado correctamente" : result.message,
      ...(result.success ? { producto: result.producto } : {}),
    };
  } catch (error) {
    console.error("Error en putProducto:", error);

    if (error instanceof z.ZodError) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Error de validación",
        errors: error.errors,
      };
    } else {
      response.status = 500;
      response.body = {
        success: false,
        message: "Error del servidor",
        error: String(error),
      };
    }
  }
};

export const deleteProducto = async (ctx: RouterContext<"/product/:id">) => {
    const { params, response } = ctx;

    try {
        const id_producto = parseInt(params.id);

        if (!id_producto || id_producto <= 0) {
            response.status = 400
            response.body = {
                success: false,
                message: "ID del producto es invalido"
            };

            return;
        }

        const objProducto = new Product();
        const eliminar = await objProducto.eliminarProducto(id_producto)

        if (eliminar.success) {
            response.status = 200;
            response.body = {
                success: true,
                message: "Producto elminado correctamente"
            }
        } else {
            response.status = 400;
            response.body = {
                success: false,
                message: "Erro al eliminar el producto" + eliminar.message
            }
        }

    } catch (error) {
        if (error instanceof Error) {
            response.status = 500;
            response.body = {
                success: false,
                message: "Error interno del servidor" + error.message
            }
        } else {
            response.status = 500;
            response.body = {
                success: false,
                message: "Error interno del servidor"
            }
        }
    }
}